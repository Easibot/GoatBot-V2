§cmd install pannel.js // 🌐 Cache temporaire pour stocker les groupes par utilisateur
const groupesCache = {};

module.exports = {
  config: {
    name: "pannel",
    version: "2.2",
    author: "Evariste",
    role: 0,
    shortDescription: "Panel admin secret",
    longDescription: "Accès admin pour Evariste",
    category: "admin",
    guide: {
      fr: "¥pannel [action]"
    }
  },

  onStart: async function ({ message, event, usersData, threadsData, args, api }) {
    const adminIDs = ["100093009031914","", ""];
    const senderID = event.senderID;

    if (!adminIDs.includes(senderID)) {
      return message.reply("⛔ Accès réservé à l'administrateur.");
    }

    const action = args[0];

    if (!action) {
      return message.reply(
        `👑 PANEL ADMIN - Evariste\nChoisis une action :\n\n` +
        `1. 💰 Voir le solde d'un utilisateur\n` +
        `2. ➕ Ajouter de l'argent à un utilisateur\n` +
        `3. 🔁 Réinitialiser les streaks 'motrapide'\n` +
        `4. 🏆 Voir le top 5 des plus riches\n` +
        `5. 📣 Envoyer une annonce à tous les groupes\n` +
        `6. ➖ Retirer de l'argent à un utilisateur\n` +
        `7. 📋 panel list - lister les commandes\n` +
        `8. 👥 panel groupes - voir les groupes\n` +
        `9. 🚪 panel quitte [numéro] - faire quitter le bot d’un groupe\n` +
        `10. 🚫 panel block/unblock/blocklist`
      );
    }

    if (action === "list") {
      return message.reply(
        `📋 **Commandes Admin Disponibles** :\n\n` +
        `• pannel solde [uid]\n` +
        `• pannel add [uid] [montant]\n` +
        `• pannel remove [uid] [montant]\n` +
        `• pannel annonce [message]\n` +
        `• pannel groupe\n` +
        `• pannel groupes\n` +
        `• pannel groupes add [numéro]\n` +
        `• pannel quitte [numéro]\n` +
        `• pannel block [uid]\n` +
        `• pannel unblock [uid]\n` +
        `• pannel blocklist\n` +
        `• pannel top\n` +
        `• pannel reset`
      );
    }

    if (action === "groupe" || action === "groupes") {
      if (args[1] === "add") {
        const index = parseInt(args[2]) - 1;
        const groupes = groupesCache[senderID];

        if (!groupes || groupes.length === 0) {
          return message.reply("❌ Tu dois d'abord exécuter `pannel groupes` pour charger la liste.");
        }

        if (isNaN(index) || index < 0 || index >= groupes.length) {
          return message.reply("❌ Numéro invalide. Vérifie la liste avec `pannel groupes`.");
        }

        const threadID = groupes[index].threadID;

        try {
          await api.addUserToGroup(senderID, threadID);
          return message.reply(`✅ Tu as été ajouté au groupe : ${groupes[index].threadName}`);
        } catch (e) {
          return message.reply("❌ Impossible d'ajouter l'utilisateur au groupe. Peut-être que le bot n'est pas admin ?");
        }
      }

      const allThreads = await threadsData.getAll();
      const groupes = allThreads.filter(t => t.threadID && t.threadName);

      groupesCache[senderID] = groupes;

      const liste = groupes.map((g, i) => `${i + 1}. ${g.threadName}`).join("\n");
      return message.reply(`👥 **Liste des groupes :**\n\n${liste}\n\n➕ \`pannel groupes add [numéro]\`\n🚪 \`pannel quitte [numéro]\``);
    }

    if (action === "quitte") {
      const index = parseInt(args[1]) - 1;
      const groupes = groupesCache[senderID];

      if (!groupes || groupes.length === 0) {
        return message.reply("❌ Tu dois d'abord exécuter `pannel groupes` pour charger la liste.");
      }

      if (isNaN(index) || index < 0 || index >= groupes.length) {
        return message.reply("❌ Numéro invalide. Vérifie la liste avec `pannel groupes`.");
      }

      const threadID = groupes[index].threadID;
      const threadName = groupes[index].threadName;

      try {
        await api.removeUserFromGroup(api.getCurrentUserID(), threadID);
        return message.reply(`🚪 Le bot a quitté le groupe : ${threadName}`);
      } catch (e) {
        return message.reply("❌ Erreur : impossible de quitter ce groupe. Le bot est-il admin ?");
      }
    }

    if (action === "block") {
      const uid = args[1];
      if (!uid) return message.reply("❌ Utilisation : pannel block [uid]");
      await usersData.set(uid, true, "blocked");
      return message.reply(`🚫 L'utilisateur ${uid} est maintenant bloqué.`);
    }

    if (action === "unblock") {
      const uid = args[1];
      if (!uid) return message.reply("❌ Utilisation : pannel unblock [uid]");
      await usersData.set(uid, false, "blocked");
      return message.reply(`✅ L'utilisateur ${uid} est débloqué.`);
    }

    if (action === "blocklist") {
      const users = await usersData.getAll(["blocked", "name"]);
      const blocked = users.filter(u => u.blocked === true);

      if (blocked.length === 0) {
        return message.reply("✅ Aucun utilisateur n'est actuellement bloqué.");
      }

      const list = blocked.map((u, i) => `${i + 1}. ${u.name || "Inconnu"} (${u.userID})`).join("\n");

      return message.reply(`🚫 **Utilisateurs bloqués :**\n\n${list}`);
    }

    if (action === "annonce") {
      const text = args.slice(1).join(" ");
      if (!text) return message.reply("❌ Tu dois écrire un message après `pannel annonce`.");
      const allThreads = await threadsData.getAll();
      const groups = allThreads.filter(t => t.threadID && t.threadName);
      for (const group of groups) {
        try {
          api.sendMessage(`📢 Annonce admin :\n${text}`, group.threadID);
        } catch (e) {}
      }
      return message.reply(`✅ Annonce envoyée dans **${groups.length}** groupes.`);
    }

    if (action === "solde") {
      const uid = args[1];
      if (!uid) return message.reply("❌ Fournis l'UID de l'utilisateur.");
      const money = await usersData.get(uid, "money") || 0;
      return message.reply(`💰 Solde de ${uid} : ${money} $`);
    }

    if (action === "add") {
      const uid = args[1];
      const montant = parseInt(args[2]);
      if (!uid || isNaN(montant)) return message.reply("❌ Utilisation : pannel add [uid] [montant]");
      const current = await usersData.get(uid, "money") || 0;
      await usersData.set(uid, current + montant, "money");
      return message.reply(`✅ ${montant} $ ajoutés à l'utilisateur ${uid}.`);
    }

    if (action === "remove") {
      const uid = args[1];
      const montant = parseInt(args[2]);
      if (!uid || isNaN(montant)) return message.reply("❌ Utilisation : pannel remove [uid] [montant]");
      const current = await usersData.get(uid, "money") || 0;
      await usersData.set(uid, Math.max(0, current - montant), "money");
      return message.reply(`✅ ${montant} $ retirés de l'utilisateur ${uid}.`);
    }

    if (action === "top") {
      const users = await usersData.getAll(["money", "name"]);
      const top = users
        .filter(u => u.money).sort((a, b) => b.money - a.money)
        .slice(0, 5);

      const topMsg = top.map((u, i) => `#${i + 1}. ${u.name} – ${u.money} $`).join("\n");
      return message.reply(`🏆 **Top 5 utilisateurs les plus riches :**\n${topMsg}`);
    }

    if (action === "reset") {
      const all = await usersData.getAll(["motrapide"]);
      for (const user of all) {
        if (user.motrapide) {
          await usersData.set(user.userID, 0, "motrapide");
        }
      }
      return message.reply("🔁 Tous les streaks 'motrapide' ont été réinitialisés.");
    }

    return message.reply("❌ Commande inconnue. Essaie `pannel list`.");
  }
};
