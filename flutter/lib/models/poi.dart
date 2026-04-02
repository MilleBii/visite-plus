class Poi {
  final int id;
  final int egliseId;
  final String type; // 'vitrail' | 'statue' | 'tableau' | 'demarche'
  final String titre;
  final double positionX; // coordonnée locale X (mètres, repère CRS.Simple)
  final double positionY; // coordonnée locale Y (mètres, repère CRS.Simple)
  final String? photo;
  final String? texteResume;
  final String? texteComprendre;
  final String? texteHistorique;
  final String? texteBible;

  const Poi({
    required this.id,
    required this.egliseId,
    required this.type,
    required this.titre,
    required this.positionX,
    required this.positionY,
    this.photo,
    this.texteResume,
    this.texteComprendre,
    this.texteHistorique,
    this.texteBible,
  });

  factory Poi.fromJson(Map<String, dynamic> json) {
    final position = json['position'] as List<dynamic>?;
    return Poi(
      id: json['id'] as int,
      egliseId: json['eglise_id'] as int,
      type: json['type'] as String,
      titre: json['titre'] as String,
      positionX: position != null
          ? (position[0] as num).toDouble()
          : (json['position_x'] as num).toDouble(),
      positionY: position != null
          ? (position[1] as num).toDouble()
          : (json['position_y'] as num).toDouble(),
      photo: json['photo'] as String?,
      texteResume: json['texte_resume'] as String?,
      texteComprendre: json['texte_comprendre'] as String?,
      texteHistorique: json['texte_historique'] as String?,
      texteBible: json['texte_bible'] as String?,
    );
  }

  /// Texte complet pour la lecture TTS (toutes les sections non vides)
  String get texteTts {
    final parts = <String>[];
    if (texteResume != null && texteResume!.isNotEmpty) parts.add(texteResume!);
    if (texteComprendre != null && texteComprendre!.isNotEmpty) parts.add(texteComprendre!);
    if (texteHistorique != null && texteHistorique!.isNotEmpty) parts.add(texteHistorique!);
    if (texteBible != null && texteBible!.isNotEmpty) parts.add(texteBible!);
    return parts.join('\n\n');
  }
}
