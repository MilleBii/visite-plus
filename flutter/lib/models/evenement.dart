class Evenement {
  final String id;
  final String type; // 'messe' | 'confession' | 'evenement'
  final String titre;
  final DateTime dateHeure;
  final String? description;
  final String? source; // 'local' | 'google_calendar' | 'messe_info'

  const Evenement({
    required this.id,
    required this.type,
    required this.titre,
    required this.dateHeure,
    this.description,
    this.source = 'local',
  });

  factory Evenement.fromJson(Map<String, dynamic> json) {
    // Parsing depuis la table evenements (BD locale)
    final dateStr = json['date'] as String;
    final heureStr = json['heure'] as String? ?? '00:00';
    final hParts = heureStr.replaceAll('h', ':').split(':');
    final hour = int.tryParse(hParts[0]) ?? 0;
    final minute = hParts.length > 1 ? (int.tryParse(hParts[1]) ?? 0) : 0;
    final date = DateTime.parse(dateStr);

    return Evenement(
      id: (json['id'] ?? json['titre']).toString(),
      type: json['type'] as String,
      titre: json['titre'] as String,
      dateHeure: DateTime(date.year, date.month, date.day, hour, minute),
      description: json['description'] as String?,
      source: 'local',
    );
  }

  /// Parsing depuis Google Calendar API
  factory Evenement.fromGoogleCalendar(Map<String, dynamic> json) {
    final startJson = json['start'] as Map<String, dynamic>?;
    if (startJson == null) {
      // Fallback si format inattendu
      return Evenement(
        id: json['id'] as String? ?? 'unknown',
        type: 'evenement',
        titre: json['summary'] as String? ?? 'Événement',
        dateHeure: DateTime.now(),
        description: json['description'] as String?,
        source: 'google_calendar',
      );
    }

    final startStr = startJson['dateTime'] as String? ?? startJson['date'] as String?;
    if (startStr == null) {
      return Evenement(
        id: json['id'] as String? ?? 'unknown',
        type: 'evenement',
        titre: json['summary'] as String? ?? 'Événement',
        dateHeure: DateTime.now(),
        description: json['description'] as String?,
        source: 'google_calendar',
      );
    }

    final dateHeure = DateTime.parse(startStr).toLocal();

    // Catégorisation selon le titre (heuristique)
    String type = 'evenement';
    final titleLower = (json['summary'] as String? ?? '').toLowerCase();
    if (titleLower.contains('messe') ||
        titleLower.contains('eucharistie') ||
        titleLower.contains('office')) {
      type = 'messe';
    } else if (titleLower.contains('confession') ||
        titleLower.contains('réconciliation')) {
      type = 'confession';
    }

    return Evenement(
      id: json['id'] as String,
      type: type,
      titre: json['summary'] as String,
      dateHeure: dateHeure,
      description: json['description'] as String?,
      source: 'google_calendar',
    );
  }

  /// Parsing depuis l'API Messe Info (futur)
  factory Evenement.fromMesseInfo(Map<String, dynamic> json) {
    // Format Messe Info : à adapter selon la vraie API
    return Evenement(
      id: json['id'] as String? ?? json['titre'],
      type: 'messe', // Messe Info = principalement des messes
      titre: json['titre'] as String,
      dateHeure: DateTime.parse(json['dateHeure'] as String),
      description: json['description'] as String?,
      source: 'messe_info',
    );
  }

  /// Comparaison pour déduplication (basée sur titre + dateTime)
  bool isSameAs(Evenement other) {
    return titre.toLowerCase() == other.titre.toLowerCase() &&
        dateHeure.difference(other.dateHeure).inMinutes.abs() < 5;
  }

  /// Badge visuel pour identifier la source
  String get sourceBadge {
    switch (source) {
      case 'google_calendar':
        return '📅 Google Agenda';
      case 'messe_info':
        return '⛪ Messe Info';
      case 'local':
      default:
        return '📌 Agenda local';
    }
  }
}
