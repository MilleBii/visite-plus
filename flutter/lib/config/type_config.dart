import 'package:flutter/material.dart';

class PoiTypeConfig {
  final Color color;
  final String emoji;
  final IconData icon;

  const PoiTypeConfig({
    required this.color,
    required this.emoji,
    required this.icon,
  });
}

class EvenementTypeConfig {
  final Color color;
  final Color backgroundColor;

  const EvenementTypeConfig({
    required this.color,
    required this.backgroundColor,
  });
}

const Map<String, PoiTypeConfig> poiTypeConfig = {
  'vitrail': PoiTypeConfig(
    color: Color(0xFF3B82F6),
    emoji: '💠',
    icon: Icons.window,
  ),
  'statue': PoiTypeConfig(
    color: Color(0xFF8B5CF6),
    emoji: '👼',
    icon: Icons.person_outline,
  ),
  'tableau': PoiTypeConfig(
    color: Color(0xFFF59E0B),
    emoji: '🖼️',
    icon: Icons.image_outlined,
  ),
  'demarche': PoiTypeConfig(
    color: Color(0xFF10B981),
    emoji: '🕯️',
    icon: Icons.local_fire_department_outlined,
  ),
};

const Map<String, EvenementTypeConfig> evenementTypeConfig = {
  'messe': EvenementTypeConfig(
    color: Color(0xFF7C3AED),
    backgroundColor: Color(0xFFEDE9FE),
  ),
  'confession': EvenementTypeConfig(
    color: Color(0xFFD97706),
    backgroundColor: Color(0xFFFEF3C7),
  ),
  'evenement': EvenementTypeConfig(
    color: Color(0xFF059669),
    backgroundColor: Color(0xFFD1FAE5),
  ),
};

PoiTypeConfig getPoiConfig(String type) {
  return poiTypeConfig[type] ??
      const PoiTypeConfig(
        color: Color(0xFF78716C),
        emoji: '📍',
        icon: Icons.place_outlined,
      );
}

EvenementTypeConfig getEvenementConfig(String type) {
  return evenementTypeConfig[type] ??
      const EvenementTypeConfig(
        color: Color(0xFF059669),
        backgroundColor: Color(0xFFD1FAE5),
      );
}

class EgliseTypeMarkerConfig {
  static const Map<String, Color> colors = {
    'cathédrale': Color(0xFF7C3AED),
    'sanctuaire': Color(0xFFD97706),
    'église': Color(0xFF1B4332),
  };

  static Color getColor(String type) => colors[type] ?? const Color(0xFF1B4332);
}
