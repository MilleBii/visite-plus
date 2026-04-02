class Evenement {
  final String id;
  final String type; // 'messe' | 'confession' | 'evenement'
  final String titre;
  final DateTime dateHeure;
  final String? description;

  const Evenement({
    required this.id,
    required this.type,
    required this.titre,
    required this.dateHeure,
    this.description,
  });

  factory Evenement.fromJson(Map<String, dynamic> json) {
    // Parsing depuis la BDD locale (table evenements)
    final dateStr = json['date'] as String;
    final heureStr = json['heure'] as String? ?? '00:00';
    final hParts = heureStr.replaceAll('h', ':').split(':');
    final hour = int.tryParse(hParts[0]) ?? 0;
    final minute = hParts.length > 1 ? (int.tryParse(hParts[1]) ?? 0) : 0;
    final date = DateTime.parse(dateStr);

    return Evenement(
      id: json['id'].toString(),
      type: json['type'] as String,
      titre: json['titre'] as String,
      dateHeure: DateTime(date.year, date.month, date.day, hour, minute),
      description: json['description'] as String?,
    );
  }

  /// Parsing depuis Google Calendar API
  factory Evenement.fromGoogleCalendar(Map<String, dynamic> json) {
    final startJson = json['start'] as Map<String, dynamic>;
    final startStr = startJson['dateTime'] as String? ?? startJson['date'] as String;
    final dateHeure = DateTime.parse(startStr).toLocal();

    // Catégorisation selon le titre (heuristique)
    String type = 'evenement';
    final titleLower = (json['summary'] as String? ?? '').toLowerCase();
    if (titleLower.contains('messe') || titleLower.contains('eucharistie') || titleLower.contains('office')) {
      type = 'messe';
    } else if (titleLower.contains('confession') || titleLower.contains('réconciliation')) {
      type = 'confession';
    }

    return Evenement(
      id: json['id'] as String,
      type: type,
      titre: json['summary'] as String? ?? 'Événement',
      dateHeure: dateHeure,
      description: json['description'] as String?,
    );
  }
}
