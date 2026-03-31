import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, Button, Text } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const TipCard = ({
  icon = "lightbulb-on-outline",
  title,
  description,
  actionLabel,
  onAction,
  onDismiss,
  onStopTips,
  compact = false,
  style,
}) => {
  return (
    <Card style={[styles.card, compact && styles.compactCard, style]}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Icon name={icon} size={20} color="#4f46e5" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {actionLabel && onAction ? (
          <Button
            mode="contained-tonal"
            compact
            onPress={onAction}
            style={styles.actionButton}
          >
            {actionLabel}
          </Button>
        ) : null}
        {onDismiss ? (
          <Button compact onPress={onDismiss} textColor="#4b5563">
            Got it
          </Button>
        ) : null}
        {onStopTips ? (
          <Button compact onPress={onStopTips} textColor="#6b7280">
            Stop tips
          </Button>
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#eef2ff",
  },
  compactCard: {
    padding: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: "#374151",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 6,
  },
  actionButton: {
    marginRight: "auto",
  },
});

export default TipCard;
