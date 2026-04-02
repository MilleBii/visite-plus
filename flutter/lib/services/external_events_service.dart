/// Service pour récupérer les événements depuis des sources externes
/// (Google Calendar, Messe Info, etc.)
///
/// Usage:
///   final events = await ExternalEventsService.fetchGoogleCalendarEvents(calendarId);
/// 
/// Note: À terme, les appels Google Calendar devraient passer par une Edge Function
/// Supabase plutôt que directement depuis le client Flutter.
class ExternalEventsService {
  /// DEPRECATED: Cette méthode ne devrait pas être utilisée directement.
  /// En production: les appels Google Calendar passent par la Edge Function Supabase.
  /// 
  /// Pour le dev/test seulement : appel direct reste possible mais nécessite http package.
  @Deprecated('Utiliser SupabaseService.fetchEvenements() à la place (qui appelle l\'Edge Function)')
  static Future<List<String>> fetchGoogleCalendarEvents(
    String calendarId, {
    DateTime? startTime,
    DateTime? endTime,
  }) async {
    // Placeholder : en prod, utiliser l'Edge Function Supabase
    // qui gère les credentials Google Calendar server-side
    // ignore: avoid_print
    print('ℹ️ GoogleCalendarEvents fetch via Edge Function (placeholder)');
    return [];
  }

  /// Placeholder pour Messe Info — à implémenter selon l'API réelle
  static Future<List<String>> fetchMesseInfoEvents(String messeInfoId) async {
    try {
      // https://api.messe.info/... 
      // À adapter selon la doc Messe Info
      // ignore: avoid_print
      print('ℹ️ fetchMesseInfoEvents not yet implemented for: $messeInfoId');
      return [];
    } catch (e) {
      // ignore: avoid_print
      print('Erreur fetchMesseInfoEvents: $e');
      return [];
    }
  }
}
