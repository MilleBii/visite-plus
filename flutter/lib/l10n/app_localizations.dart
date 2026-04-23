import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_fr.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('fr')
  ];

  /// No description provided for @churchNotFound.
  ///
  /// In fr, this message translates to:
  /// **'Église introuvable.'**
  String get churchNotFound;

  /// No description provided for @backToMap.
  ///
  /// In fr, this message translates to:
  /// **'Retour à la carte'**
  String get backToMap;

  /// No description provided for @error.
  ///
  /// In fr, this message translates to:
  /// **'Erreur'**
  String get error;

  /// No description provided for @understandChristianity.
  ///
  /// In fr, this message translates to:
  /// **'Comprendre la religion chrétienne'**
  String get understandChristianity;

  /// No description provided for @visitChurch.
  ///
  /// In fr, this message translates to:
  /// **'Visiter cette église'**
  String get visitChurch;

  /// No description provided for @schedule.
  ///
  /// In fr, this message translates to:
  /// **'Événements'**
  String get schedule;

  /// No description provided for @searchHint.
  ///
  /// In fr, this message translates to:
  /// **'Rechercher une église...'**
  String get searchHint;

  /// No description provided for @visit.
  ///
  /// In fr, this message translates to:
  /// **'Visiter'**
  String get visit;

  /// No description provided for @understandReligion.
  ///
  /// In fr, this message translates to:
  /// **'Comprendre la religion'**
  String get understandReligion;

  /// No description provided for @faq.
  ///
  /// In fr, this message translates to:
  /// **'Questions fréquentes'**
  String get faq;

  /// No description provided for @poiNotFound.
  ///
  /// In fr, this message translates to:
  /// **'POI introuvable.'**
  String get poiNotFound;

  /// No description provided for @sectionResume.
  ///
  /// In fr, this message translates to:
  /// **'Résumé'**
  String get sectionResume;

  /// No description provided for @sectionComprendre.
  ///
  /// In fr, this message translates to:
  /// **'Comprendre l\'œuvre'**
  String get sectionComprendre;

  /// No description provided for @sectionHistorique.
  ///
  /// In fr, this message translates to:
  /// **'Contexte historique'**
  String get sectionHistorique;

  /// No description provided for @sectionBible.
  ///
  /// In fr, this message translates to:
  /// **'Dans la Bible'**
  String get sectionBible;

  /// No description provided for @ttsListen.
  ///
  /// In fr, this message translates to:
  /// **'Écouter'**
  String get ttsListen;

  /// No description provided for @ttsPause.
  ///
  /// In fr, this message translates to:
  /// **'Pause'**
  String get ttsPause;

  /// No description provided for @ttsStop.
  ///
  /// In fr, this message translates to:
  /// **'Arrêter'**
  String get ttsStop;

  /// No description provided for @churchPlan.
  ///
  /// In fr, this message translates to:
  /// **'Plan de l\'église'**
  String get churchPlan;

  /// No description provided for @osmMissing.
  ///
  /// In fr, this message translates to:
  /// **'Polygone OSM manquant pour cette église.'**
  String get osmMissing;

  /// No description provided for @tapToLearnMore.
  ///
  /// In fr, this message translates to:
  /// **'Appuyer pour en savoir plus →'**
  String get tapToLearnMore;

  /// No description provided for @noEvents.
  ///
  /// In fr, this message translates to:
  /// **'Aucun événement à venir'**
  String get noEvents;

  /// No description provided for @comeBackSoon.
  ///
  /// In fr, this message translates to:
  /// **'Revenez bientôt !'**
  String get comeBackSoon;

  /// No description provided for @poiTypeVitrail.
  ///
  /// In fr, this message translates to:
  /// **'Vitrail'**
  String get poiTypeVitrail;

  /// No description provided for @poiTypeStatue.
  ///
  /// In fr, this message translates to:
  /// **'Statue'**
  String get poiTypeStatue;

  /// No description provided for @poiTypeTableau.
  ///
  /// In fr, this message translates to:
  /// **'Tableau'**
  String get poiTypeTableau;

  /// No description provided for @poiTypeDemarche.
  ///
  /// In fr, this message translates to:
  /// **'Démarche'**
  String get poiTypeDemarche;

  /// No description provided for @poiTypeInformation.
  ///
  /// In fr, this message translates to:
  /// **'Information'**
  String get poiTypeInformation;

  /// No description provided for @poiTypePriere.
  ///
  /// In fr, this message translates to:
  /// **'Prière'**
  String get poiTypePriere;

  /// No description provided for @poiTypeOther.
  ///
  /// In fr, this message translates to:
  /// **'Autre'**
  String get poiTypeOther;

  /// No description provided for @evenementTypeMesse.
  ///
  /// In fr, this message translates to:
  /// **'Messe'**
  String get evenementTypeMesse;

  /// No description provided for @evenementTypeConfession.
  ///
  /// In fr, this message translates to:
  /// **'Confession'**
  String get evenementTypeConfession;

  /// No description provided for @evenementTypeEvenement.
  ///
  /// In fr, this message translates to:
  /// **'Événement'**
  String get evenementTypeEvenement;

  /// No description provided for @dateLocale.
  ///
  /// In fr, this message translates to:
  /// **'fr_FR'**
  String get dateLocale;

  /// No description provided for @datePattern.
  ///
  /// In fr, this message translates to:
  /// **'EEEE d MMMM'**
  String get datePattern;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'fr'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'fr':
      return AppLocalizationsFr();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
