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
  const [coachingUsage, setCoachingUsage] = useState({
    count: 0,
    limit: FREE_COACHING_LIMIT,
    remaining: FREE_COACHING_LIMIT,
  });

  const { totalHeight: tabBarTotalHeight } = useTabBarHeight();

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const localStats = await FirebaseService.getUserStats();
        setUserStats((current) => ({ ...current, ...localStats }));

        const [stats, tipsState, seenGuide, usageStatus] = await Promise.all([
          FirebaseService.getUserStats(),
          TipsService.areTipsEnabled(),
          TipsService.hasSeenGuide("settings_overview"),
          FirebaseService.getAICoachingUsageStatus(FREE_COACHING_LIMIT),
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
        setIsOffline(false);
      } catch (error) {
        console.error("Settings bootstrap error:", error);
        const localStats = await FirebaseService.getUserStats();
        const usageStatus =
          await FirebaseService.getAICoachingUsageStatus(FREE_COACHING_LIMIT);
        setUserStats((current) => ({ ...current, ...localStats }));
        setCoachingUsage(usageStatus);
        setIsOffline(true);
      }
    };

    bootstrap();
  }, [user?.email]);

  const openPremium = () => navigation.getParent()?.navigate("Premium");
  const openAchievements = () =>
    navigation.getParent()?.navigate("Achievements");

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
    setNotificationsEnabled(true);
    Alert.alert(
      "Notifications on",
      "You can re-enable reminder times on individual habits.",
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
      const file = await PrivacyComplianceService.exportUserDataToFile(
        user?.uid || FirebaseService.currentUser?.uid || "habitowl_user",
      );
      Alert.alert(
        "Export ready",
        `Your export file is ready: ${file?.uri || "saved to device storage"}`,
      );
    } catch (error) {
      Alert.alert("Export failed", error.message || "Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await PrivacyComplianceService.requestAccountDeletion(
        user?.uid || FirebaseService.currentUser?.uid || "habitowl_user",
        deleteReason.trim() || "User requested account deletion",
      );
      setShowDeleteDialog(false);
      setDeleteReason("");
      Alert.alert(
        "Deletion requested",
        "Your account deletion request was scheduled according to the app privacy flow.",
      );
    } catch (error) {
      Alert.alert("Request failed", error.message || "Please try again.");
    }
  };

  const handleRateApp = async () => {
    await RateAppService.trackPositiveMoment(5);
    await RateAppService.promptIfEligible();
  };

  const coachingDescription =
    isPremium || isAdmin
      ? "Unlimited AI coaching is enabled on your plan."
      : `Free plan: ${coachingUsage.remaining}/${coachingUsage.limit} coaching sessions left today.`;

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
              description="Open the rating prompt if you find the app useful"
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
                Linking.openURL("https://habitowl-3405d.web.app/privacy")
              }
            />
            <List.Item
              title="Terms of service"
              description="Open hosted terms page"
              left={(props) => (
                <List.Icon {...props} icon="file-document-outline" />
              )}
              onPress={() =>
                Linking.openURL("https://habitowl-3405d.web.app/terms")
              }
            />
            <List.Item
              title="Request account deletion"
              description="Start the deletion flow"
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
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button textColor="#dc2626" onPress={handleDeleteAccount}>
              Request deletion
            </Button>
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
