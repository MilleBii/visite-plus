export const eglise = {
  id: 1,
  nom: "Église Saint-Victor",
  ville: "Saône",
  type: "église",
  position: [47.2252, 6.1176],
  photo_facade: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Sa%C3%B4ne%2C_l%27%C3%A9glise.jpg",
  message_bienvenue: "Croyant ou non, bienvenue dans cette église !",
  osm_rotation_angle: 322, // angle validé manuellement — entrée en bas, chœur en haut
}

export const eglises = [
  eglise,
  {
    id: 2,
    nom: "Église Saint-Valère",
    ville: "Nancray",
    type: "église",
    position: [47.2462, 6.1835],
    photo_facade: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Sa%C3%B4ne%2C_l%27%C3%A9glise.jpg",
    message_bienvenue: "Croyant ou non, bienvenue dans cette église !",
  },
  {
    id: 3,
    nom: "Basilique Notre-Dame de Fourvière",
    ville: "Lyon",
    type: "basilique",
    position: [45.761975, 4.822197],
    photo_facade: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/BasiliqueFourviere.jpg/640px-BasiliqueFourviere.jpg",
    message_bienvenue: "Bienvenue à la basilique Notre-Dame de Fourvière, sanctuaire marial dominant Lyon depuis 1896.",
    osm_rotation_angle: 0, // à ajuster dans le BO
  },
]

export const pois = [
  {
    id: 1,
    type: "vitrail",
    titre: "Vitrail de la Vierge bleue",
    position: [120, 280],
    photo: "https://upload.wikimedia.org/wikipedia/commons/d/dc/Chartres_-_cath%C3%A9drale_-_ND_de_la_belle_verri%C3%A8re.JPG",
    texte_resume: "Ce vitrail du XIIe siècle représente la Vierge Marie en majesté, tenant l'enfant Jésus. Il est l'un des plus anciens et des mieux conservés de la cathédrale.",
    texte_comprendre: "Le bleu de Chartres, ce pigment inimitable, est le secret de ce vitrail. Sa composition exacte reste encore aujourd'hui un mystère pour les experts.",
    texte_historique: "Réalisé vers 1150, ce vitrail a miraculeusement survécu aux guerres et révolutions. Il fut déposé et mis en sécurité durant les deux guerres mondiales.",
    texte_bible: "« Une femme revêtue du soleil, la lune sous ses pieds, et une couronne de douze étoiles sur la tête. » — Apocalypse 12:1",
  },
  {
    id: 2,
    type: "statue",
    titre: "Statue de Saint Jacques",
    position: [220, 320],
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Chartres_-_cathédrale_-_statue_portail_nord.jpg/400px-Chartres_-_cathédrale_-_statue_portail_nord.jpg",
    texte_resume: "Statue en pierre du XVe siècle représentant l'apôtre Jacques, reconnaissable à son bâton de pèlerin et sa coquille Saint-Jacques.",
    texte_comprendre: "Les statues des piliers étaient le 'livre de pierre' des fidèles médiévaux, la plupart ne sachant pas lire.",
    texte_historique: "Sculptée vers 1430 par un atelier local, cette statue a été restaurée en 2018 dans le cadre du grand chantier de restauration de la cathédrale.",
    texte_bible: "« Allez, faites de toutes les nations des disciples. » — Matthieu 28:19",
  },
  {
    id: 3,
    type: "tableau",
    titre: "Tableau de l'Annonciation",
    position: [320, 250],
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Annunciation_-_Da_Vinci.jpg/400px-Annunciation_-_Da_Vinci.jpg",
    texte_resume: "Huile sur toile du XVIIe siècle représentant l'archange Gabriel annonçant à Marie qu'elle sera la mère de Jésus.",
    texte_comprendre: "Le peintre joue sur les contrastes de lumière pour mettre en valeur le moment de la révélation divine.",
    texte_historique: "Offert à la cathédrale en 1687 par le chapitre de chanoines, ce tableau est attribué à l'école française.",
    texte_bible: "« Tu concevras et tu enfanteras un fils, et tu lui donneras le nom de Jésus. » — Luc 1:31",
  },
  {
    id: 4,
    type: "demarche",
    titre: "Cierges et intention de prière",
    position: [400, 300],
    photo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Votive_candles_in_church.jpg/400px-Votive_candles_in_church.jpg",
    texte_resume: "Allumer un cierge est un geste de prière. La flamme symbolise votre intention confiée à Dieu, qui continue de brûler après votre départ.",
    texte_comprendre: "Ce geste universel transcende les cultures. La lumière représente le Christ, 'lumière du monde'.",
    texte_historique: "La pratique des cierges votifs remonte aux premiers chrétiens. Elle s'est répandue en Occident à partir du VIe siècle.",
    texte_bible: "« Vous êtes la lumière du monde. » — Matthieu 5:14",
  },
]

export const evenements = [
  { id: 1, type: "messe", titre: "Messe dominicale", date: "2026-03-29", heure: "10h30", description: "Messe solennelle avec chœur" },
  { id: 2, type: "messe", titre: "Messe en semaine", date: "2026-03-30", heure: "12h00", description: "" },
  { id: 3, type: "confession", titre: "Confession", date: "2026-03-28", heure: "16h00", description: "Sur rendez-vous ou en attente" },
  { id: 4, type: "evenement", titre: "Concert de Pâques", date: "2026-04-05", heure: "20h30", description: "Ensemble vocal Palestrina — entrée libre" },
  { id: 5, type: "messe", titre: "Messe de Pâques", date: "2026-04-05", heure: "11h00", description: "Messe solennelle de Pâques" },
]

export const questions = [
  {
    id: 1,
    question: "Qui était Jésus ?",
    reponse: "Pour les chrétiens, Jésus est le Fils de Dieu, né d'une vierge, mort sur la croix et ressuscité. Il est à la fois pleinement humain et pleinement divin. Son enseignement, résumé dans les Évangiles, est centré sur l'amour de Dieu et du prochain.",
  },
  {
    id: 2,
    question: "C'est quoi la messe ?",
    reponse: "La messe est le rassemblement des chrétiens catholiques pour célébrer l'eucharistie — le partage du pain et du vin qui rappelle le dernier repas de Jésus. C'est à la fois un repas symbolique, une prière commune et un mémorial.",
  },
  {
    id: 3,
    question: "Pourquoi des statues et des vitraux ?",
    reponse: "Au Moyen Âge, la plupart des gens ne savaient pas lire. Les images, statues et vitraux étaient la 'Bible des pauvres' : ils racontaient les histoires saintes à travers l'art. Aujourd'hui, ils invitent encore à la contemplation et à la méditation.",
  },
  {
    id: 4,
    question: "Comment prier dans une église ?",
    reponse: "Il n'y a pas de règle. On peut s'asseoir, se recueillir en silence, allumer un cierge, lire les textes affichés, ou simplement observer. Une église est un lieu ouvert à tous — croyants ou non — pour un moment de calme et de réflexion.",
  },
]

export const typeConfig = {
  vitrail: { label: "Vitrail", color: "#3B82F6", icon: "🪟" },
  statue: { label: "Statue", color: "#8B5CF6", icon: "🗿" },
  tableau: { label: "Tableau", color: "#F59E0B", icon: "🖼️" },
  demarche: { label: "Démarche", color: "#10B981", icon: "🕯️" },
}

export const evenementConfig = {
  messe: { label: "Messe", color: "#7C3AED", bg: "#EDE9FE" },
  confession: { label: "Confession", color: "#D97706", bg: "#FEF3C7" },
  evenement: { label: "Événement", color: "#059669", bg: "#D1FAE5" },
}
