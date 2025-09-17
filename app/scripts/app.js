let client;

init();

async function init() {
    client = await app.initialized();
    client.events.on('app.activated', appActiveHandler);
}

function appActiveHandler() {
    console.info("App is activated");
    renderText();
}

function displayStatus(type, message) {
    client.interface.trigger('showNotify', { type: type, message: message });
}

function codeLogiciel(Nom) {
    const tableau = {
        "CLIMAWIN%202020": 2001,
        "CLIMAWIN": 1001,
        "LISE": 1205,
        "CLIMAUDIT": 1208,
        "PHYSALIS%20MENUISERIE": 1207,
        "PHYSALIS": 1201,
        "PHYSALIS%20VITRAGE": 1211,
        "PHYSALIS%20FA%20Fa%C3%A7ADE": 1202,
        "PHYSALIS%20THERM": 1210,
        "%C3%89CO-DIAG": 1200,
        "LISE%20V3/LISE%20BIM": 1209
    };

    if (Nom) return tableau[encodeURI(Nom.toUpperCase())];
    else return -1;
}

async function getTicketDetails() {
    try {
        const ticketData = await client.data.get('ticket');
        const {
            ticket: {
                custom_fields: {
                    logiciel,
                    n_de_licence
                }
            }
        } = ticketData;
        
        const ticketDetails = {
            nom: logiciel,
            licence: n_de_licence,
            identifiant: codeLogiciel(logiciel)
        };
        
        afficheTitre(ticketDetails);
        afficheLien(ticketDetails);
        return ticketDetails;

    } catch (error) {
        console.error("Erreur lors de la récupération des détails du ticket:", error);
        writeToId('titre', "Champs personnalisés manquants ou illisibles.");
        return null;
    }
}

async function getLicenceDetails(details) {
    try {
        const data = await client.request.invokeTemplate("fetchFromGoogleScript", {
            context: {
                s: details.identifiant,
                l: details.licence,
                type: "licence" // On dit au script ce qu'on veut
            }
        });
        displayStatus('success', 'Informations de licence récupérées');
        // Le Google Script renvoie directement le bon JSON, on peut l'utiliser
        afficheInformations(data.response);
    } catch (error) {
        const status = error.status || 'inconnu';
        const message = `Échec requête Licence via proxy (Code: ${status})`;
        displayStatus('danger', message);
        console.error("Erreur de requête (Proxy Licence):", error);
        writeToId("societe", `<span class="alert">${message}</span>`);
        showId("donnees");
    }
}

async function getSAVDetails(details) {
    try {
        const data = await client.request.invokeTemplate("fetchFromGoogleScript", {
            context: {
                s: details.identifiant,
                l: details.licence,
                type: "sav" // On dit au script ce qu'on veut
            }
        });
        displayStatus('success', 'Informations SAV récupérées');
        // Le Google Script renvoie directement le bon JSON
        afficheInformationsSAV(data.response);
    } catch (error) {
        const status = error.status || 'inconnu';
        const message = `Échec requête SAV via proxy (Code: ${status})`;
        displayStatus('danger', message);
        console.error("Erreur de requête (Proxy SAV):", error);
        writeToId("sav", `<span class="alert">${message}</span>`);
    }
}

function writeToId(id, text, alert = false) {
    const textElement = document.getElementById(id);
    if (textElement) {
        textElement.innerHTML = text;
        if (alert) textElement.classList.add("alert");
        else textElement.classList.remove("alert");
    }
}

function showId(id) {
    const element = document.getElementById(id);
    if (element) {
        element.style.display = 'block';
    }
}

function hideId(id) {
    const element = document.getElementById(id);
    if (element) {
        element.style.display = 'none';
    }
}

function afficheTitre(details) {
    if (!details || !details.nom)
        writeToId('titre', "Nom du logiciel manquant");
    else if (!details.licence)
        writeToId('titre', "N° de licence manquant");
    else
        writeToId('titre', details.nom + "<br>licence n°" + details.licence);
}

function chaineDate(laDate) {
    if (laDate === '2050-12-31') return "perpétuelle";
    else return (new Date(laDate).toLocaleDateString());
}

function chaineClef(type) {
    const tableau = { 1: "SuperPro", 2: "LDK HL", 3: "LDK SL", 99: "Sans clef" };
    return tableau[type];
}

function afficheLien(details) {
    if (details && details.identifiant && details.licence) {
        const Fiche_URL = "https://intranet.bbs-logiciels.com/wincli/licence.php";
        const lien = document.getElementById("lienfiche");
        if (lien) {
            lien.href = Fiche_URL + '?s=' + details.identifiant + '&l=' + details.licence;
        }
    }
}

function decode_utf8(s) {
    try {
      return decodeURIComponent(escape(s));
    } catch(e) {
      return s; // Retourne la chaine originale en cas d'erreur
    }
}

function afficheInformations(Donnees) {
    try {
        const {
            infos: {
                nom,
                adresse: { ville }
            },
            version: {
                reseau,
                jetons,
                dateExpiration
            },
            droitMaJ: {
                actif,
                dateFin
            },
            clef: {
                type,
                code,
                clehebergee
            }
        } = JSON.parse(Donnees);

        writeToId("societe", nom);
        writeToId("ville", ville);
        writeToId("validite", chaineDate(dateExpiration));

        if (actif === "1")
            writeToId("maintenance", "jusqu'au<br>" + chaineDate(dateFin));
        else
            writeToId("maintenance", "échue", true);

        if (reseau === "1")
            writeToId("reseau", "oui<br>" + jetons + " jetons");
        else
            writeToId("reseau", "non");

        if (clehebergee === "1")
            writeToId("clehebergee", "oui");
        else
            writeToId("clehebergee", "non");

        writeToId("typeclef", chaineClef(type));
        writeToId("codeclef", code);

        showId("donnees");
    } catch (error) {
        console.error("Erreur lors de l'affichage des informations:", error);
        writeToId("societe", "Impossible de lire les données de licence.");
    }
}

function afficheInformationsSAV(Donnees) {
    try {
        const {
            AvecSAV,
            BlocageTelechargement
        } = JSON.parse(Donnees);

        if (AvecSAV === "1")
            writeToId("sav", "SAV OK");
        else
            writeToId("sav", "sans SAV", true);

        if (BlocageTelechargement === "1")
            writeToId("blocagetel", "bloqué", true);
        else
            writeToId("blocagetel", "non");
    } catch(error) {
        console.error("Erreur lors de l'affichage des informations SAV:", error);
        writeToId("sav", "Données SAV illisibles.");
    }
}

async function renderText() {
    hideId("donnees");
    const ticketDetails = await getTicketDetails();

    if (ticketDetails && ticketDetails.identifiant !== -1 && ticketDetails.licence) {
        await Promise.all([
            getLicenceDetails(ticketDetails),
            getSAVDetails(ticketDetails)
        ]);
    }
    
    client.instance.resize({ height: "400px" });
}