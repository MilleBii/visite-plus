#!/bin/bash
# setup-supabase.sh
# Script d'aide pour configurer rapidement Supabase pour Visite+ Flutter
# 
# Usage:
#   bash setup-supabase.sh <supabase-project-id> <supabase-api-key>
#
# Exemple:
#   bash setup-supabase.sh lbksiotvnnpqkwslwjoq sb_live_xxx...

set -e

if [ $# -lt 1 ]; then
    echo "❌ Usage: bash setup-supabase.sh <project-id> [api-key]"
    echo ""
    echo "Récupérez le Project ID et l'API key depuis:"
    echo "  https://app.supabase.com/project/<project-id>/settings/api"
    echo ""
    exit 1
fi

PROJECT_ID=$1
API_KEY=${2:-""}

echo "📋 Configuration Supabase pour Visite+ Flutter"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Project ID: $PROJECT_ID"
echo ""

# Étapes suggérées
echo "📝 Étapes de configuration:"
echo ""
echo "1️⃣  Exécuter le schéma BD (une fois)"
echo "   → Aller sur: https://app.supabase.com/project/$PROJECT_ID/sql/new"
echo "   → Copier/coller le contenu de: supabase_schema.sql"
echo "   → Cliquer 'Run'"
echo ""

echo "2️⃣  Exécuter les RLS policies"
echo "   → Aller sur: https://app.supabase.com/project/$PROJECT_ID/sql/new"
echo "   → Copier/coller le contenu de: supabase_rls_setup.sql"
echo "   → Cliquer 'Run'"
echo ""

echo "3️⃣  Mettre à jour main.dart avec les credentials"
echo "   → Aller sur: https://app.supabase.com/project/$PROJECT_ID/settings/api"
echo "   → Copier 'Project URL' et 'anon key'"
echo "   → Remplacer dans: flutter/lib/main.dart"
echo ""
echo "   _supabaseUrl = 'https://$PROJECT_ID.supabase.co'  # ← remplacer"
echo "   _supabaseAnonKey = 'sb_...'                       # ← remplacer"
echo ""

echo "4️⃣  (Optionnel) Configurer Google Calendar"
echo "   → Créer un compte service Google avec Calendar API"
echo "   → Dans Supabase Settings → Secrets, ajouter:"
echo "      supabase secrets set GOOGLE_CALENDAR_API_KEY=..."
echo ""

echo "5️⃣  (Optionnel) Déployer Edge Function"
echo "   → supabase functions new get_google_calendar_events"
echo "   → Implémenter en Deno/TypeScript (voir supabase_edge_function_placeholder.sql)"
echo "   → supabase functions deploy"
echo ""

echo "6️⃣  Tester localement"
echo "   → flutter pub get"
echo "   → flutter run"
echo ""

echo "✅ Configuration manuelle complète !"
echo ""
echo "Pour plus d'info:"
echo "  - SUPABASE_FLUTTER_CONFIG.md"
echo "  - DEPLOYMENT_CHECKLIST.md"
echo "  - architecture.md"
