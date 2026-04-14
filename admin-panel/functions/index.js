const { onCall, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

async function assertAdminEmail(email) {
  const settingsSnap = await db.collection('admin_config').doc('settings').get();
  const adminEmails = settingsSnap.exists && Array.isArray(settingsSnap.data().admin_emails)
    ? settingsSnap.data().admin_emails.map((value) => String(value).toLowerCase().trim())
    : [];

  if (!adminEmails.includes(String(email || '').toLowerCase().trim())) {
    throw new HttpsError('permission-denied', 'Admin access required.');
  }
}

function chunkArray(items, chunkSize = 450) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

async function deleteDocs(docSnapshots) {
  if (!docSnapshots.length) {
    return 0;
  }

  const chunks = chunkArray(docSnapshots);
  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }

  return docSnapshots.length;
}

async function getDocsByField(collectionName, field, value) {
  const snapshot = await db.collection(collectionName).where(field, '==', value).get();
  return snapshot.docs;
}

exports.adminDeleteUserAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to use this action.');
  }

  await assertAdminEmail(request.auth.token.email);

  const userId = String(request.data?.userId || '').trim();
  const requestId = String(request.data?.requestId || '').trim();

  if (!userId) {
    throw new HttpsError('invalid-argument', 'userId is required.');
  }

  logger.info('Admin deletion started', {
    userId,
    requestId,
    adminEmail: request.auth.token.email,
  });

  const deletedRecords = {
    userDocument: 0,
    habits: 0,
    analytics: 0,
    referrals: 0,
    supportTickets: 0,
    crashReports: 0,
    userConsents: 0,
    dataExports: 0,
  };

  const userDocs = await getDocsByField('users', 'uid', userId);
  const userData = userDocs[0]?.data() || null;

  if (userData) {
    await db.collection('deleted_users_archive').add({
      ...userData,
      originalUserId: userId,
      deletedAt: new Date().toISOString(),
      deletedBy: request.auth.token.email || 'admin',
      deletionMode: 'complete',
      sourceRequestId: requestId || null,
    });
  }

  deletedRecords.habits = await deleteDocs(await getDocsByField('habits', 'userId', userId));
  deletedRecords.analytics = await deleteDocs(await getDocsByField('analytics', 'userId', userId));
  deletedRecords.supportTickets = await deleteDocs(await getDocsByField('support_tickets', 'userId', userId));
  deletedRecords.crashReports = await deleteDocs(await getDocsByField('crash_reports', 'userId', userId));
  deletedRecords.userConsents = await deleteDocs(await getDocsByField('user_consents', 'userId', userId));
  deletedRecords.dataExports = await deleteDocs(await getDocsByField('data_exports', 'userId', userId));

  const referralDocs = [
    ...(await getDocsByField('referrals', 'referrerId', userId)),
    ...(await getDocsByField('referrals', 'referredUserId', userId)),
  ];
  const uniqueReferralDocs = Array.from(new Map(referralDocs.map((docSnap) => [docSnap.ref.path, docSnap])).values());
  deletedRecords.referrals = await deleteDocs(uniqueReferralDocs);

  deletedRecords.userDocument = await deleteDocs(userDocs);

  let deletionRequestRef = null;
  if (requestId) {
    deletionRequestRef = db.collection('deletion_requests').doc(requestId);
  } else {
    const pendingRequests = await db
      .collection('deletion_requests')
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    deletionRequestRef = pendingRequests.empty ? null : pendingRequests.docs[0].ref;
  }

  if (deletionRequestRef) {
    await deletionRequestRef.set(
      {
        status: 'completed',
        completedAt: new Date().toISOString(),
        completedBy: request.auth.token.email || 'admin',
      },
      { merge: true }
    );
  }

  let authDeleted = false;
  let authAlreadyMissing = false;

  try {
    await auth.deleteUser(userId);
    authDeleted = true;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      authAlreadyMissing = true;
      logger.warn('Auth user already missing during deletion', { userId });
    } else {
      logger.error('Auth deletion failed', { userId, error: error.message });
      throw new HttpsError('internal', `Firestore data deleted but Auth deletion failed: ${error.message}`);
    }
  }

  await db.collection('admin_actions').add({
    actionType: 'account_deletion_completed',
    userId,
    requestId: requestId || null,
    performedBy: request.auth.token.email || 'admin',
    performedAt: new Date().toISOString(),
    deletedRecords,
    authDeleted,
    authAlreadyMissing,
  });

  logger.info('Admin deletion completed', {
    userId,
    deletedRecords,
    authDeleted,
    authAlreadyMissing,
  });

  return {
    success: true,
    userId,
    authDeleted,
    authAlreadyMissing,
    deletedRecords,
  };
});
