import 'package:flutter/material.dart';

class PoiTypeConfig {
  final String label;
  final String labelEn;
  final Color color;
  final String emoji;
  final IconData icon;

  const PoiTypeConfig({
    required this.label,
    required this.labelEn,
    required this.color,
    required this.emoji,
    required this.icon,
  });

  String getLabel(String languageCode) => languageCode == 'en' ? labelEn : label;
}

class EvenementTypeConfig {
  final String label;
  final String labelEn;
  final Color color;
  final Color backgroundColor;

  const EvenementTypeConfig({
    required this.label,
    required this.labelEn,
    required this.color,
    required this.backgroundColor,
  });

  String getLabel(String languageCode) => languageCode == 'en' ? labelEn : label;
}

const Map<String, PoiTypeConfig> poiTypeConfig = {
  'vitrail': PoiTypeConfig(
    label: 'Vitrail',
    labelEn: 'Stained glass',
    color: Color(0xFF3B82F6),
    emoji: '🪟',
    icon: Icons.window,
  ),
  'statue': PoiTypeConfig(
    label: 'Statue',
    labelEn: 'Statue',
    color: Color(0xFF8B5CF6),
    emoji: '🗿',
    icon: Icons.person_outline,
  ),
  'tableau': PoiTypeConfig(
    label: 'Tableau',
    labelEn: 'Painting',
    color: Color(0xFFF59E0B),
    emoji: '🖼️',
    icon: Icons.image_outlined,
  ),
  'demarche': PoiTypeConfig(
    label: 'Démarche',
    labelEn: 'Practice',
    color: Color(0xFF10B981),
    emoji: '🕯️',
    icon: Icons.local_fire_department_outlined,
  ),
};

const Map<String, EvenementTypeConfig> evenementTypeConfig = {
  'messe': EvenementTypeConfig(
    label: 'Messe',
    labelEn: 'Mass',
    color: Color(0xFF7C3AED),
    backgroundColor: Color(0xFFEDE9FE),
  ),
  'confession': EvenementTypeConfig(
    label: 'Confession',
    labelEn: 'Confession',
    color: Color(0xFFD97706),
    backgroundColor: Color(0xFFFEF3C7),
  ),
  'evenement': EvenementTypeConfig(
    label: 'Événement',
    labelEn: 'Event',
    color: Color(0xFF059669),
    backgroundColor: Color(0xFFD1FAE5),
  ),
};

PoiTypeConfig getPoiConfig(String type) {
  return poiTypeConfig[type] ??
      const PoiTypeConfig(
        label: 'Autre',
        labelEn: 'Other',
        color: Color(0xFF78716C),
        emoji: '📍',
        icon: Icons.place_outlined,
      );
}

EvenementTypeConfig getEvenementConfig(String type) {
  return evenementTypeConfig[type] ??
      const EvenementTypeConfig(
        label: 'Événement',
        labelEn: 'Event',
        color: Color(0xFF059669),
        backgroundColor: Color(0xFFD1FAE5),
      );
}

/// Icônes de types d'église pour la carte France
class EgliseTypeMarkerConfig {
  static const Map<String, Color> colors = {
    'cathédrale': Color(0xFF7C3AED),
    'sanctuaire': Color(0xFFD97706),
    'église': Color(0xFF1B4332),
  };

  static Color getColor(String type) => colors[type] ?? const Color(0xFF1B4332);
}
