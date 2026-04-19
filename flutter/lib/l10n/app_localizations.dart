import 'package:flutter/material.dart';

class AppLocalizations {
  final Locale locale;
  AppLocalizations(this.locale);

  bool get _fr => locale.languageCode == 'fr';

  // ── Common ────────────────────────────────────────────────────────────────
  String get churchNotFound => _fr ? 'Église introuvable.' : 'Church not found.';
  String get backToMap => _fr ? 'Retour à la carte' : 'Back to map';
  String get error => _fr ? 'Erreur' : 'Error';

  // ── Accueil ───────────────────────────────────────────────────────────────
  String get understandChristianity =>
      _fr ? 'Comprendre la religion chrétienne' : 'Understand Christianity';
  String get visitChurch => _fr ? 'Visiter cette église' : 'Visit this church';
  String get schedule => _fr ? 'Événements' : 'Events';

  // ── Carte ─────────────────────────────────────────────────────────────────
  String get searchHint => _fr ? 'Rechercher une église...' : 'Search for a church...';
  String get visit => _fr ? 'Visiter' : 'Visit';

  // ── Comprendre ────────────────────────────────────────────────────────────
  String get understandReligion => _fr ? 'Comprendre la religion' : 'Understand Christianity';
  String get faq => _fr ? 'Questions fréquentes' : 'Frequently asked questions';

  // ── Fiche POI ─────────────────────────────────────────────────────────────
  String get poiNotFound => _fr ? 'POI introuvable.' : 'Point of interest not found.';
  String get sectionResume => _fr ? 'Résumé' : 'Summary';
  String get sectionComprendre => _fr ? 'Comprendre l\'œuvre' : 'About this artwork';
  String get sectionHistorique => _fr ? 'Contexte historique' : 'Historical context';
  String get sectionBible => _fr ? 'Dans la Bible' : 'In the Bible';
  String get ttsListen => _fr ? 'Écouter' : 'Listen';
  String get ttsPause => _fr ? 'Pause' : 'Pause';
  String get ttsStop => _fr ? 'Arrêter' : 'Stop';

  // ── Plan ──────────────────────────────────────────────────────────────────
  String get churchPlan => _fr ? 'Plan de l\'église' : 'Church floor plan';
  String get osmMissing =>
      _fr ? 'Polygone OSM manquant pour cette église.' : 'OSM footprint missing for this church.';
  String get tapToLearnMore =>
      _fr ? 'Appuyer pour en savoir plus →' : 'Tap to learn more →';

  // ── Programme ─────────────────────────────────────────────────────────────
  String get noEvents => _fr ? 'Aucun événement à venir' : 'No upcoming events';
  String get comeBackSoon => _fr ? 'Revenez bientôt !' : 'Check back soon!';

  // ── POI type labels ───────────────────────────────────────────────────────
  String poiTypeLabel(String type) {
    const fr = {
      'vitrail': 'Vitrail',
      'statue': 'Statue',
      'tableau': 'Tableau',
      'demarche': 'Démarche',
    };
    const en = {
      'vitrail': 'Stained glass',
      'statue': 'Statue',
      'tableau': 'Painting',
      'demarche': 'Practice',
    };
    return (_fr ? fr[type] : en[type]) ?? (_fr ? 'Autre' : 'Other');
  }

  // ── Event type labels ─────────────────────────────────────────────────────
  String evenementTypeLabel(String type) {
    const fr = {
      'messe': 'Messe',
      'confession': 'Confession',
      'evenement': 'Événement',
    };
    const en = {
      'messe': 'Mass',
      'confession': 'Confession',
      'evenement': 'Event',
    };
    return (_fr ? fr[type] : en[type]) ?? (_fr ? 'Événement' : 'Event');
  }

  // ── Date format locale ────────────────────────────────────────────────────
  String get dateLocale => _fr ? 'fr_FR' : 'en_US';
  String get datePattern => _fr ? 'EEEE d MMMM' : 'EEEE, MMMM d';
}
