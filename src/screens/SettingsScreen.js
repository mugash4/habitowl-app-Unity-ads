import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Linking,
} from "react-native";
import {
  Card,
  List,
  Switch,
  Button,
  Dialog,
  Portal,
  TextInput,
  Chip,
} from "react-native-paper";

import FirebaseService from "../services/FirebaseService";
import SecureAIService from "../services/SecureAIService";
import NotificationService from "../services/NotificationService";
import AdminService from "../services/AdminService";
import TipsService from "../services/TipsService";
import RateAppService from "../services/RateAppService";
import PrivacyComplianceService from "../services/PrivacyComplianceService";
import AdMobBanner from "../components/AdMobBanner";
import TipCard from "../components/TipCard";
import PremiumFeatureCard from "../components/PremiumFeatureCard";
import OfflineAdCard from "../components/OfflineAdCard";
import ContactSupport from "../components/ContactSupport";
import { useTabBarHeight } from "../hooks/useTabBarHeight";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.mugash4.habitowl";
const WEB_BASE_URL = "https://habitowl-3405d.web.app";
const PRIVACY_POLICY_URL = `${WEB_BASE_URL}/privacy.html`;
const TERMS_OF_SERVICE_URL = `${WEB_BASE_URL}/terms.html`;
const DELETE_DATA_URL = `${WEB_BASE_URL}/delete-data.html`;
const FREE_COACHING_LIMIT = 2;

const SettingsScreen = ({ navigation }) => {
  const user = FirebaseService.currentUser;
  const [userStats, setUserStats] = useState({
    displayName: user?.displayName || "HabitOwl User",
    email: user?.email || "",
    totalHabits: 0,
    longestStreak: 0,
    referralCode: "",
  });
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [tipsEnabled, setTipsEnabled] = useState(true);
  const [apiProvider, setApiProvider] = useState("deepseek");
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState({
    hasPendingDeletion: false,
  });
  const [coachingUsage, setCoachingUsage] = useState({
    count: 0,
    limit: FREE_COACHING_LIMIT,
    remaining: FREE_COACHING_LIMIT,
  });

  const { totalHeight: tabBarTotalHeight } = useTabBarHeight();

  useEffect(() => {
    const bootstrap = async () => {
      const targetUserId =
        user?.uid || FirebaseService.currentUser?.uid || "habitowl_user";

      try {
        const localStats = await FirebaseService.getUserStats();
        setUserStats((current) => ({ ...current, ...localStats }));

        const [
          stats,
          tipsState,
          seenGuide,
          usageStatus,
          deletionStatus,
        ] = await Promise.all([
          FirebaseService.getUserStats(),
          TipsService.areTipsEnabled(),
          TipsService.hasSeenGuide("settings_overview"),
          FirebaseService.getAICoachingUsageStatus(FREE_COACHING_LIMIT),
          PrivacyComplianceService.checkPendingDeletion(targetUserId),
        ]);

        const adminStatus = user?.email
          ? await AdminService.checkAdminStatus(user.email)
          : false;
        const provider = await SecureAIService.getActiveProvider(
          !!stats?.isPremium || adminStatus,
        ).catch(() => "deepseek");
        const permission = await NotificationService.checkPermissionStatus();

        setUserStats((current) => ({ ...current, ...stats }));
        setIsPremium(!!stats?.isPremium || adminStatus);
        setIsAdmin(adminStatus);
        setApiProvider(provider || "deepseek");
        setTipsEnabled(!!tipsState);
        setNotificationsEnabled(permission?.status === "granted");
        setShowGuide(!seenGuide);
        setCoachingUsage(usageStatus);
        setPendingDeletion(deletionStatus || { hasPendingDeletion: false });
        setIsOffline(false);
      } catch (error) {
        console.error("Settings bootstrap error:", error);
        const localStats = await FirebaseService.getUserStats();
        const usageStatus =
          await FirebaseService.getAICoachingUsageStatus(FREE_COACHING_LIMIT);
        const deletionStatus =
          await PrivacyComplianceService.checkPendingDeletion(targetUserId);

        setUserStats((current) => ({ ...current, ...localStats }));
        setCoachingUsage(usageStatus);
        setPendingDeletion(deletionStatus || { hasPendingDeletion: false });
        setIsOffline(true);
      }
    };

    bootstrap();
  }, [user?.email, user?.uid]);

  const openPremium = () => navigation.getParent()?.navigate("Premium");
  const openAchievements = () =>
    navigation.getParent()?.navigate("Achievements");

  const openExternalUrl = async (url, fallbackTitle = "Unable to open link") => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(
          fallbackTitle,
          "Your device could not open this link. Please try again later.",
        );
        return false;
      }

      await Linking.openURL(url);
      return true;
    } catch (error) {
      Alert.alert(
        fallbackTitle,
        error?.message || "Something went wrong while opening the link.",
      );
      return false;
    }
  };

  const handleToggleTips = async () => {
    const next = !tipsEnabled;
    await TipsService.setTipsEnabled(next);
    setTipsEnabled(next);
    if (next) {
      await TipsService.resetTips();
      Alert.alert(
        "Tips enabled",
        "Guides and inline habit tips will appear again.",
      );
    }
  };

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      await NotificationService.cancelAllNotifications();
      setNotificationsEnabled(false);
      return Alert.alert(
        "Notifications off",
        "Daily habit reminders were cancelled on this device.",
      );
    }

    await NotificationService.initialize();
    const permission = await NotificationService.checkPermissionStatus();
    const enabled = permission?.status === "granted";
    setNotificationsEnabled(enabled);

    Alert.alert(
      enabled ? "Notifications on" : "Notifications unavailable",
      enabled
        ? "You can re-enable reminder times on individual habits."
        : "Notification permission was not granted on this device.",
    );
  };

  const handleShareApp = async () => {
    const code = userStats?.referralCode || "HABITOWL";
    await Share.share({
      title: "HabitOwl",
      message: `HabitOwl helps me stay consistent. Use referral code ${code} and try it here: ${PLAY_STORE_URL}`,
    });
  };

  const handleReferralSubmit = async () => {
    if (!referralCode.trim()) {
      return Alert.alert("Enter a code", "Please enter a referral code first.");
    }
    try {
      await FirebaseService.processReferral(referralCode.trim().toUpperCase());
      setShowReferralDialog(false);
      setReferralCode("");
      Alert.alert("Referral applied", "Your code was accepted successfully.");
    } catch (error) {
      Alert.alert("Referral failed", error.message || "Please try again.");
    }
  };

  const handleExportData = async () => {
    try {
      const result = await PrivacyComplianceService.exportUserDataToFile(
        user?.uid || FirebaseService.currentUser?.uid || "habitowl_user",
      );

      Alert.alert(
        "Export ready",
        result?.shared
          ? "Your data export file was prepared and the share sheet has been opened. Choose where you want to save or send it."
          : `Your data export file is ready at: ${result?.uri || "device storage"}`,
      );
    } catch (error) {
      Alert.alert("Export failed", error.message || "Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const result = await PrivacyComplianceService.requestAccountDeletion(
        user?.uid || FirebaseService.currentUser?.uid || "habitowl_user",
        deleteReason.trim() || "User requested account deletion",
      );

      const refreshedStatus = await PrivacyComplianceService.checkPendingDeletion(
        user?.uid || FirebaseService.currentUser?.uid || "habitowl_user",
      );

      setPendingDeletion(refreshedStatus || { hasPendingDeletion: false });
      setShowDeleteDialog(false);
      setDeleteReason("");

      Alert.alert(
        result?.alreadyPending ? "Deletion already scheduled" : "Deletion requested",
        result?.message ||
          "Your account deletion request was scheduled according to the app privacy flow.",
      );
    } catch (error) {
      Alert.alert("Request failed", error.message || "Please try again.");
    }
  };

  const handleCancelDeletion = async () => {
    try {
      const cancelled = await PrivacyComplianceService.cancelAccountDeletion(
        user?.uid || FirebaseService.currentUser?.uid || "habitowl_user",
      );

      const refreshedStatus = await PrivacyComplianceService.checkPendingDeletion(
        user?.uid || FirebaseService.currentUser?.uid || "habitowl_user",
      );

      setPendingDeletion(refreshedStatus || { hasPendingDeletion: false });
      setShowDeleteDialog(false);

      Alert.alert(
        cancelled ? "Deletion cancelled" : "Nothing to cancel",
        cancelled
          ? "Your pending account deletion request was cancelled successfully."
          : "There is no active deletion request on this account.",
      );
    } catch (error) {
      Alert.alert("Cancel failed", error.message || "Please try again.");
    }
  };

  const handleRateApp = async () => {
    await RateAppService.requestManualReview();
  };

  const coachingDescription =
    isPremium || isAdmin
      ? "Unlimited AI coaching is enabled on your plan."
      : `Free plan: ${coachingUsage.remaining}/${coachingUsage.limit} coaching sessions left today.`;

  const deletionDescription = pendingDeletion?.hasPendingDeletion
    ? `Deletion already requested. ${pendingDeletion.daysRemaining} day(s) remaining in grace period.`
    : "Start the deletion flow";

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarTotalHeight + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {showGuide ? (
          <TipCard
            title="Settings control user trust"
            description="Keep monetization clear, tips optional, and premium benefits visible. This screen is where users decide whether the app feels respectful."
            onDismiss={async () => {
              await TipsService.markGuideSeen("settings_overview");
              setShowGuide(false);
            }}
            onStopTips={async () => {
              await TipsService.setTipsEnabled(false);
              setShowGuide(false);
              setTipsEnabled(false);
            }}
            style={styles.sectionSpacing}
          />
        ) : null}

        <Card style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>
                {userStats.displayName || "HabitOwl User"}
              </Text>
              <Text style={styles.profileEmail}>
                {userStats.email || "Quick stats view"}
              </Text>
            </View>
            <Chip
              compact
              style={isPremium ? styles.planChipPremium : styles.planChipFree}
              textStyle={
                isPremium ? styles.planChipPremiumText : styles.planChipFreeText
              }
            >
              {isAdmin ? "Admin" : isPremium ? "Premium" : "Free"}
            </Chip>
          </View>

          <View style={styles.profileStatsRow}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>
                {userStats.totalHabits || 0}
              </Text>
              <Text style={styles.profileStatLabel}>Habits</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>
                {userStats.longestStreak || 0}
              </Text>
              <Text style={styles.profileStatLabel}>Best streak</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatValue}>
                {isPremium || isAdmin ? "∞" : coachingUsage.remaining}
              </Text>
              <Text style={styles.profileStatLabel}>AI today</Text>
            </View>
          </View>
        </Card>

        {!isPremium && !isAdmin && !isOffline ? (
          <View style={styles.sectionSpacing}>
            <AdMobBanner />
          </View>
        ) : null}

        {!isPremium && !isAdmin && isOffline ? (
          <View style={styles.sectionSpacing}>
            <OfflineAdCard message="Your settings stay available offline. Ad placements will return once the connection is back." />
          </View>
        ) : null}

        {!isPremium && !isAdmin ? (
          <PremiumFeatureCard
            title="Premium remains visible"
            description="Free users can see exactly what they would unlock before subscribing. Premium removes every ad placement in the app."
            bullets={[
              "Ad-free experience",
              "Unlimited habits + advanced schedule",
              "Unlimited AI coaching and premium analytics",
            ]}
            onPress={openPremium}
            style={styles.sectionSpacing}
          />
        ) : null}

        <Card style={styles.sectionCard}>
          <List.Section>
            <List.Subheader style={styles.subheader}>
              Preferences
            </List.Subheader>
            <List.Item
              title="Notifications"
              description="Enable or disable device reminders"
              left={(props) => <List.Icon {...props} icon="bell-outline" />}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                />
              )}
            />
            <List.Item
              title="Tips and guides"
              description="Show inline help on cards and screens"
              left={(props) => (
                <List.Icon {...props} icon="lightbulb-outline" />
              )}
              right={() => (
                <Switch value={tipsEnabled} onValueChange={handleToggleTips} />
              )}
            />
            <List.Item
              title="AI coaching"
              description={coachingDescription}
              left={(props) => <List.Icon {...props} icon="robot-outline" />}
              right={() =>
                !isPremium && !isAdmin ? (
                  <Button compact mode="text" onPress={openPremium}>
                    Upgrade
                  </Button>
                ) : null
              }
            />
            <List.Item
              title="AI provider"
              description={`Current provider: ${apiProvider}`}
              left={(props) => <List.Icon {...props} icon="brain" />}
              onPress={() =>
                Alert.alert(
                  "AI provider",
                  `HabitOwl is currently set to ${apiProvider}.`,
                )
              }
            />
          </List.Section>
        </Card>

        <Card style={styles.sectionCard}>
          <List.Section>
            <List.Subheader style={styles.subheader}>
              Growth & sharing
            </List.Subheader>
            <List.Item
              title="Achievements"
              description="View your medals, badges, and unlocked milestones"
              left={(props) => <List.Icon {...props} icon="medal-outline" />}
              onPress={openAchievements}
            />
            <List.Item
              title="Share the app"
              description="Invite more users with your referral code"
              left={(props) => (
                <List.Icon {...props} icon="share-variant-outline" />
              )}
              onPress={handleShareApp}
            />
            <List.Item
              title="Use referral code"
              description="Apply a referral code"
              left={(props) => (
                <List.Icon {...props} icon="ticket-percent-outline" />
              )}
              onPress={() => setShowReferralDialog(true)}
            />
            <List.Item
              title="Rate HabitOwl"
              description="Open the Play Store rating page"
              left={(props) => <List.Icon {...props} icon="star-outline" />}
              onPress={handleRateApp}
            />
          </List.Section>
        </Card>

        <Card style={styles.sectionCard}>
          <List.Section>
            <List.Subheader style={styles.subheader}>
              Data & support
            </List.Subheader>
            <List.Item
              title="AI Support"
              description="Chat with support inside the app"
              left={(props) => <List.Icon {...props} icon="lifebuoy" />}
              onPress={() => setShowSupport(true)}
            />
            <List.Item
              title="Open statistics"
              description="Review streaks, heatmap, and weekly insights"
              left={(props) => <List.Icon {...props} icon="chart-line" />}
              onPress={() => navigation.navigate("Statistics")}
            />
            <List.Item
              title="Export my data"
              description="Download a copy of your habits and account data"
              left={(props) => <List.Icon {...props} icon="download-outline" />}
              onPress={handleExportData}
            />
            <List.Item
              title="Privacy policy"
              description="Open hosted privacy page"
              left={(props) => (
                <List.Icon {...props} icon="shield-check-outline" />
              )}
              onPress={() =>
                openExternalUrl(PRIVACY_POLICY_URL, "Unable to open privacy policy")
              }
            />
            <List.Item
              title="Terms of service"
              description="Open hosted terms page"
              left={(props) => (
                <List.Icon {...props} icon="file-document-outline" />
              )}
              onPress={() =>
                openExternalUrl(
                  TERMS_OF_SERVICE_URL,
                  "Unable to open terms of service",
                )
              }
            />
            <List.Item
              title="Delete my data page"
              description="Open the hosted data deletion information page"
              left={(props) => (
                <List.Icon {...props} icon="web" />
              )}
              onPress={() =>
                openExternalUrl(
                  DELETE_DATA_URL,
                  "Unable to open delete data page",
                )
              }
            />
            <List.Item
              title="Request account deletion"
              description={deletionDescription}
              left={(props) => (
                <List.Icon {...props} icon="delete-alert-outline" />
              )}
              onPress={() => setShowDeleteDialog(true)}
            />
          </List.Section>
        </Card>
      </ScrollView>

      <Portal>
        <Dialog
          visible={showReferralDialog}
          onDismiss={() => setShowReferralDialog(false)}
        >
          <Dialog.Title>Apply referral code</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Referral code"
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowReferralDialog(false)}>Cancel</Button>
            <Button onPress={handleReferralSubmit}>Apply</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={showDeleteDialog}
          onDismiss={() => setShowDeleteDialog(false)}
        >
          <Dialog.Title>Request account deletion</Dialog.Title>
          <Dialog.Content>
            {pendingDeletion?.hasPendingDeletion ? (
              <Text style={styles.dialogText}>
                Your account already has a pending deletion request. There are
                {" "}
                {pendingDeletion.daysRemaining}
                {" "}
                day(s) left before the deletion is processed.
              </Text>
            ) : (
              <>
                <Text style={styles.dialogText}>
                  Tell us why you want to delete the account. This helps improve
                  retention and user trust.
                </Text>
                <TextInput
                  mode="outlined"
                  label="Reason"
                  value={deleteReason}
                  onChangeText={setDeleteReason}
                  multiline
                  style={{ marginTop: 12 }}
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Close</Button>
            {pendingDeletion?.hasPendingDeletion ? (
              <Button textColor="#dc2626" onPress={handleCancelDeletion}>
                Cancel deletion
              </Button>
            ) : (
              <Button textColor="#dc2626" onPress={handleDeleteAccount}>
                Request deletion
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ContactSupport
        visible={showSupport}
        onDismiss={() => setShowSupport(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16 },
  sectionSpacing: { marginBottom: 16 },
  profileCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    backgroundColor: "#ffffff",
  },
  profileTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  profileName: { fontSize: 22, fontWeight: "800", color: "#111827" },
  profileEmail: { marginTop: 6, fontSize: 14, color: "#6b7280" },
  planChipPremium: { backgroundColor: "#ede9fe" },
  planChipPremiumText: { color: "#6d28d9", fontWeight: "700" },
  planChipFree: { backgroundColor: "#f3f4f6" },
  planChipFreeText: { color: "#4b5563", fontWeight: "700" },
  profileStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 18,
  },
  profileStat: {
    flex: 1,
    minWidth: 90,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  profileStatValue: { fontSize: 18, fontWeight: "800", color: "#111827" },
  profileStatLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
    textTransform: "uppercase",
  },
  sectionCard: {
    borderRadius: 22,
    backgroundColor: "#ffffff",
    marginBottom: 16,
  },
  subheader: { fontSize: 14, fontWeight: "800", color: "#4b5563" },
  dialogText: { fontSize: 14, lineHeight: 20, color: "#4b5563" },
});

export default SettingsScreen;
