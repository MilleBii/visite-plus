# Questions à résoudre avec le client

## Contexte du projet

**Pilotage : Ce projet est piloté par l'équipe de l'Invisible.**

**Première approche technique :**
 Le client souhaite que l'application soit publiée sur l'Apple Store et le Google Play Store (application mobile native ou hybride).
 
 

1. **Quelle est l'origine de ce projet ?**

   ✅ **Contexte confirmé** : le projet est porté par l'1visible. Les cibles principales sont les **sanctuaires gérés par la Communauté Emmanuel** et des sites à fort trafic pèlerin comme la **Basilique de Fourvière** (Lyon, ~2M visiteurs/an). C'est un outil complémentaire à ceux existants de l'1visible.

   Questions restantes :
   - Y a-t-il un accord de principe avec la Communauté Emmanuel pour le déploiement ? (conditionne la volumétrie dès le lancement)
   - Fourvière est-il confirmé comme client pilote ?

2. **Y a-t-il déjà un projet similaire en cours dans cette structure ?**
   - Existe-t-il une initiative concurrente ou complémentaire dont il faut tenir compte ?
   - Visite+ est-il amené à s'intégrer dans un écosystème d'outils existant (site diocésain, appli, CMS) ?

## Plan de l'église

1. **Comment obtient-on le plan ?**
   - Photo prise sur place (téléphone) ?
   - Scan d'un document papier ?
   - Fichier vectoriel existant (PDF, DXF) ?
   - Dessin fait par quelqu'un ?

   - **Première version : utilisation des plans OSM sans fond de carte.**

   → Si c'est une photo : il faudra recadrer, redresser la perspective, et éventuellement nettoyer le fond. Qui fait ça ? L'admin de l'église ou une personne centralisée ?

   ✅ **Décision** : simple upload d'une image (photo, scan…). Le BO doit permettre de la repositionner / recadrer pour l'ajuster correctement sur l'interface.

2. **Quel niveau de qualité est attendu pour le plan ?**
   - Photo brute suffisante ou plan "propre" obligatoire ?
   - Doit-on prévoir un outil de recadrage dans le BO, ou les images arrivent déjà prêtes ?

   ✅ **Décision** : l'outil de positionnement est intégré au BO — l'image n'a pas besoin d'arriver prête.

## Saisie du contenu

3. **Qui saisit le contenu des fiches POI ?**

   ✅ **Décision** : c'est l'équipe de l'1visible qui saisit le contenu pour le compte des clients finaux (paroisses, sanctuaires). Les éditeurs sont des membres de l'1visible, pas des bénévoles ou curés. Le BO peut donc être plus complet sans sur-simplifier l'interface.

4. **Qui positionne les POI sur le plan ?**

   ✅ **Décision** : c'est également l'équipe de l'1visible qui positionne les POI, soit à distance depuis les documents fournis, soit en visite sur place. L'outil de positionnement doit être ergonomique pour un professionnel, pas nécessairement pour un non-technicien.

## Événements / Programme

5. **Quelle option pour la gestion des événements ?**

   ✅ **Décision** : Google Calendar comme source principale (socle), Messe Info en option additionnelle.

   - Les événements sont saisis directement dans Google Calendar (pas de saisie dans le BO)
   - Messe Info peut être activé église par église si elle est déjà référencée

   Questions restantes :
   - Les églises cibles sont-elles déjà référencées sur Messe Info ?
   - Ont-elles déjà un Google Calendar paroissial, ou faudra-t-il en créer un à l'onboarding ?

## Application mobile

6. **App native confirmée**

   ✅ **Décision** : application native Flutter, publiée sur l'Apple Store et le Google Play Store. L'expérience web responsive (ex. Trinité-des-Monts) n'est pas satisfaisante — le client veut l'effet app.

   QR Code → deep link Universal Links / App Links :
   - App installée → ouvre directement l'église dans l'app native
   - App non installée → Flutter Web dans le navigateur (visite complète) + bannière de téléchargement de l'app
   - Un seul codebase Flutter : iOS, Android, Web

## Volumétrie

7. **Combien d'églises sont envisagées ?**
   - Objectif au lancement ?
   - Objectif à 1 an, 3 ans ?
   - Y a-t-il déjà un partenariat avec un diocèse ou une fédération qui permettrait un déploiement rapide ?

   → La réponse conditionne le dimensionnement de l'hébergement et le modèle économique (gratuit pour les églises ? abonnement diocèse ? freemium ?).

## Modèle économique et souscription

8. **Quel est le modèle économique de Visite+ ?**
   - Le service est-il gratuit pour les paroisses ? Financé comment (diocèse, subventions, sponsors) ?
   - Abonnement mensuel/annuel par église ? Par diocèse (qui redistribue) ?
   - Freemium : accès de base gratuit + fonctionnalités avancées payantes ?
   - Modèle à l'acte : setup payant + maintenance incluse ?

9. **Comment une paroisse souscrit-elle au service ?**
    - Qui est l'interlocuteur côté paroisse : le curé, un bénévole, le diocèse ?
    - La demande passe-t-elle par le diocèse, ou chaque paroisse souscrit-elle directement ?
    - Y a-t-il un processus d'onboarding (formulaire de demande, validation, création du compte) ? Qui le gère ?
    - Qui crée le compte `editeur_eglise` : le super_admin manuellement, ou une inscription en self-service ?

10. **Quelle est l'unité de gestion : le clocher ou la paroisse ?**
    - Une paroisse peut regrouper 20 à 40 clochers (églises distinctes).
    - Questions à trancher :
      - L'unité de souscription et de facturation est-elle **le clocher** (une église = un abonnement) ou **la paroisse** (forfait multi-clochers) ?
      - L'`editeur_eglise` gère-t-il un seul clocher ou tous les clochers de sa paroisse ?
      - Faut-il un niveau intermédiaire **paroisse** dans le modèle (entre `super_admin` et `editeur_eglise`) ?
    - La réponse impacte directement le modèle de données, les droits d'accès et la tarification.

11. **Faut-il une interface de paiement en ligne ?**
    - Si le diocèse paye pour l'ensemble de ses paroisses → simple virement/facture B2B, pas besoin d'interface de paiement.
    - Si chaque paroisse paye individuellement → envisager **AlloAsso** (plateforme conçue pour les associations et paroisses, sans commission, reçu fiscal possible) plutôt qu'une solution généraliste.
    - À trancher avant de dimensionner l'onboarding.

## Publication stores

17. **Qui gère la publication sur l'App Store et Google Play ?**

    La soumission technique (build, signature, upload) est incluse dans le développement. Mais la publication complète implique aussi :
    - Screenshots de l'app dans toutes les langues et tous les formats d'écran requis (iPhone, iPad, Android...)
    - Textes de présentation (titre, description courte, description longue) dans chaque langue
    - Icône, bannière, éléments graphiques store
    - Réponses aux éventuels rejets Apple (processus de review parfois long)

    Deux options :
    - **Nous prenons en charge tout** → inclus dans le chiffrage, mais coût non négligeable
    - **Le client prend en charge la partie éditoriale** (textes, screenshots, visuels) → nous faisons uniquement la soumission technique → économie de 1 à 2j

---

## Comptes développeurs stores

18. **Confirmez-vous avoir un compte Apple Developer et Google Play Console actifs (via "Prier Aujourd'hui") ?**
    - Si oui → publication Visite+ directement sur vos comptes, zéro coût additionnel
    - Si non → Apple Developer ~99€/an + Google Play ~25€ unique à prévoir

---

## Run / Exploitation

12. **TMA — points à préciser**

    ✅ Le client souhaite une TMA.

    Questions à trancher :
    - Quel niveau de SLA est attendu ? (délai de réponse sur incident, disponibilité cible)
    - Le forfait de base à 300€ HT/mois est-il dans le budget, ou faut-il ajuster le périmètre ?
    - Qui gère les accès opérationnels (DNS, certificats SSL, variables d'environnement) — nous ou le client ?

## Internationalisation

14. **En combien de langues l'application sera-t-elle disponible au lancement ?**
    - Minimum attendu : français + anglais ?
    - Autres langues envisagées (espagnol, italien, allemand, portugais…) ? Dans quel ordre de priorité ?
    - Les sanctuaires à forte fréquentation internationale (Lourdes, etc.) ont des besoins différents d'une petite église de village.

15. **Traduction des contenus (fiches POI, message de bienvenue) : manuelle ou automatique ?**
    - **Manuelle** : l'équipe l'1visible traduit chaque fiche dans chaque langue → qualité maximale, coût humain élevé
    - **Automatique** (DeepL ou Google Translate) : généré à la publication → coût quasi nul, qualité variable selon la langue
    - **Hybride** : traduction auto générée, avec option de correction manuelle dans le BO
    - À trancher : la traduction automatique est-elle acceptable sans relecture pour ce type de contenu patrimonial/religieux ?

---

## Statistiques

16. **Statistiques — points restants à valider**

    Direction retenue : comptage de vues par église et par POI (affluence), stocké en BDD, affiché dans le BO.

    ✅ Destinataires : l'1visible + les clients finaux (paroisses) pour leurs propres églises

    Questions restantes :
    - Granularité souhaitée : **15 minutes ou 1 heure** ? (15 min = courbe plus fine, ex. pic de messe visible ; 1h = suffisant pour une vue journalière)
    - Faut-il un export CSV des stats ?
    - Outil de stockage : **PostgreSQL natif** (granularité libre, tout dans Supabase, purges à configurer) ou **outil dédié** type Plausible (~9€/mois, zéro ops, granularité horaire max) ou PostHog (free tier 1M events/mois, zéro ops, granularité à vérifier) ?

---

## Juridique

13. **Droits de reproduction des œuvres photographiées**

    Point probablement non anticipé, à valider avec un juriste spécialisé en droit du patrimoine **avant le lancement**.

    - La quasi-totalité des œuvres religieuses anciennes sont dans le **domaine public** (auteur mort depuis plus de 70 ans) → reproductibles librement.
    - Mais photographier à l'intérieur d'une église et **publier ces photos sur une plateforme** peut nécessiter l'autorisation du **propriétaire du lieu** :
      - La **commune** pour les églises classées ou inscrites (elle est propriétaire du bâtiment)
      - La **fabrique paroissiale** pour les autres
    - Les églises classées **Monument Historique** : vérifier si le Centre des Monuments Nationaux revendique des droits sur les reproductions.
    - **Vitraux et restaurations récentes** : peuvent être sous droits d'auteur si l'artiste est vivant ou mort depuis moins de 70 ans.
    - La **liberté de panorama** (loi 2016) ne s'applique pas aux intérieurs.

    → Prévoir une **convention de publication** à signer avec chaque paroisse/commune lors de l'onboarding, couvrant explicitement le droit de reproduire et diffuser les œuvres sur Visite+.
