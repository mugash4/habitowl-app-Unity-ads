import React from "react";
import { View, StyleSheet } from "react-native";
import { Card, Button, Text } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const PremiumFeatureCard = ({
  title,
  description,
  bullets = [],
  icon = "crown-outline",
  locked = true,
  buttonLabel = "Unlock Premium",
  onPress,
  style,
}) => {
  return (
    <Card style={[styles.card, style]}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Icon
            name={locked ? "lock-outline" : icon}
            size={22}
            color="#7c3aed"
          />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>

      {bullets.map((bullet) => (
        <View key={bullet} style={styles.bulletRow}>
          <Icon name="check-circle-outline" size={16} color="#7c3aed" />
          <Text style={styles.bulletText}>{bullet}</Text>
        </View>
      ))}

      <Button
        mode={locked ? "contained" : "contained-tonal"}
        onPress={onPress}
        style={styles.button}
      >
        {buttonLabel}
      </Button>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#4c1d95",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: "#5b21b6",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: "#4b5563",
  },
  button: {
    marginTop: 14,
    borderRadius: 14,
  },
});

export default PremiumFeatureCard;
