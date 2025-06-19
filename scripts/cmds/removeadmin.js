const storedGroups = [];

module.exports = {
  config: {
    name: "removeadmin",
    aliases: ["adminclear", "kickadmin"],
    version: "1.0",
    author: "Evariste",
    role: 2, // uniquement les admins du bot
    shortDescription: "Retire tous les admins sauf le bot",
    longDescription: "Supprime tous les administrateurs d'un groupe donné, sauf le bot lui-même",
    category: "admin",
    guide: {
      en: "{pn} <numéro du groupe>",
      fr: "{pn} <numéro du groupe>"
    }
  },

  // Fonction pour stocker les groupes depuis admingroups.js
  setStoredGroups: (groups) => {
    storedGroups.length = 0;
    storedGroups.push(...groups);
  },

  onStart: async function ({ api, message, args }) {
    const index = parseInt(args[0]);
    if (isNaN(index) || index < 1 || index > storedGroups.length) {
      return message.reply("❌ Veuillez spécifier un numéro de groupe valide. Utilisez la commande §admingroups d'abord.");
    }

    const targetGroup = storedGroups[index - 1];
    const threadID = targetGroup.threadID;

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const botID = api.getCurrentUserID();

      let removedCount = 0;

      for (const admin of threadInfo.adminIDs) {
        if (admin.id !== botID) {
          try {
            await api.changeAdminStatus(threadID, admin.id, false);
            removedCount++;
          } catch (err) {
            console.log(`Erreur suppression admin ${admin.id} : ${err.message}`);
          }
        }
      }

      return message.reply(`✅ ${removedCount} administrateur(s) retiré(s) dans le groupe : ${targetGroup.name}`);
    } catch (err) {
      return message.reply(`❌ Impossible de modifier le groupe : ${err.message}`);
    }
  }
};
