import 'app_localizations.dart';

String poiTypeLabel(AppLocalizations l10n, String type) {
  switch (type) {
    case 'vitrail':  return l10n.poiTypeVitrail;
    case 'statue':   return l10n.poiTypeStatue;
    case 'tableau':  return l10n.poiTypeTableau;
    case 'demarche':     return l10n.poiTypeDemarche;
    case 'information':  return l10n.poiTypeInformation;
    case 'priere':       return l10n.poiTypePriere;
    default:             return l10n.poiTypeOther;
  }
}

String evenementTypeLabel(AppLocalizations l10n, String type) {
  switch (type) {
    case 'messe':      return l10n.evenementTypeMesse;
    case 'confession': return l10n.evenementTypeConfession;
    default:           return l10n.evenementTypeEvenement;
  }
}
