module.exports = {
  config: {
    name: "admingroups",
    aliases: ["listadmin", "adminlist"],
    version: "2.2",
    author: "TonNom",
    role: 2,
    shortDescription: "Liste les groupes où le bot est admin + retirer les autres admins",
    longDescription: "Affiche tous les groupes où le bot est administrateur. Utilise `remove <numéro>` pour retirer tous les autres admins d’un groupe.",
    category: "admin",
    guide: {
      fr: "{pn} → Liste les groupes\n{pn} remove <numéro> → Retire tous les autres admins d’un groupe"
    }
  },

  onStart: async function ({ api, message, args }) {
    const botID = api.getCurrentUserID();
    let adminGroups = [];

    // Fonction pause pour limiter le débit des requêtes
    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    try {
      const allThreads = await api.getThreadList(100, null, ["INBOX"]);

      for (const thread of allThreads) {
        if (!thread.isGroup) continue;

        try {
          const info = await api.getThreadInfo(thread.threadID);
          const isBotAdmin = info.adminIDs.some(admin => admin.id === botID);

          if (isBotAdmin) {
            adminGroups.push({
              name: thread.name || "Sans nom",
              threadID: thread.threadID,
              adminIDs: info.adminIDs
            });
          }
        } catch (err) {
          console.log(`⚠️ Erreur sur thread ${thread.threadID} (inaccessible) : ${err.message}`);
        }
      }
    } catch (err) {
      return message.reply(`❌ Erreur lors de la récupération des conversations : ${err.message}`);
    }

    // Traitement de la commande remove
    if (args[0] === "remove") {
      const index = parseInt(args[1]);
      if (isNaN(index) || index < 1 || index > adminGroups.length) {
        const listMsg = adminGroups.map((g, i) => `${i + 1}. ${g.name} (ID: ${g.threadID})`).join("\n");
        return message.reply("❌ Numéro invalide. Groupes disponibles :\n\n" + listMsg);
      }

      const group = adminGroups[index - 1];
      let removed = 0;

      for (const admin of group.adminIDs) {
        if (admin.id !== botID) {
          try {
            await api.changeAdminStatus(group.threadID, admin.id, false);
            removed++;
            await delay(1000); // pause 1 seconde pour éviter blocage API
          } catch (err) {
            console.log(`⚠️ Erreur retrait admin ${admin.id} : ${err.message}`);
          }
        }
      }

      await api.sendMessage("⚠️ Tous les administrateurs ont été retirés par le bot (sauf lui-même).", group.threadID);
      return message.reply(`✅ ${removed} admin(s) retiré(s) dans « ${group.name} »`);
    }

    // Affichage simple des groupes si pas de remove
    if (adminGroups.length === 0) {
      return message.reply("❌ Je ne suis admin dans aucun groupe ou accès refusé.");
    }

    const listMsg = adminGroups.map((g, i) => `${i + 1}. ${g.name} (ID: ${g.threadID})`).join("\n");
    return message.reply(`📋 Groupes où je suis admin (${adminGroups.length}) :\n\n${listMsg}\n\n🛠️ Pour retirer les autres admins d’un groupe : §admingroups remove <numéro>`);
  }
};
