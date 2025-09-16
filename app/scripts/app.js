let client;
let logiciel_nom = '';
let logiciel_licence = '';
let logiciel_identifiant = -1;

init();

async function init() {
    client = await app.initialized();
    client.events.on('app.activated', appActiveHandler);
    client.events.on('app.deactivated', appDeactiveHandler);
}

function appActiveHandler()
{
    console.info("App is activated");
    renderText();
}
function appDeactiveHandler()
{
    console.info("App is deactivated");
}

function displayStatus(type, message) {
    client.interface.trigger('showNotify', {type: type, message: message});
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
        // success output
        // data is {ticket: {"subject": "support needed for..",..}}
        const {
            ticket: {
                custom_fields: {
                    logiciel,
                    n_de_licence
                }
            }
        } = ticketData;
        //console.log(ticketData);
        logiciel_nom = logiciel;
        logiciel_licence = n_de_licence;
        logiciel_identifiant = codeLogiciel(logiciel_nom);
        afficheTitre();
        afficheLien();

    } catch (error) {
        // failure operation
        console.log(error);
    }
}

async function getLicenceDetails() {
    try {
        await client.request.invokeTemplate("requestLicence", {
            context: {
                s: logiciel_identifiant,
                l: logiciel_licence
            }
        }).then(function (data) {
            displayStatus('success', 'Informations de licence récupérées');
            afficheInformations(data.response);
        }, function (error) {
            displayStatus('danger', 'Échec de la requête');
            console.log(error);
        });

    } catch (error) {
        // failure operation
        console.log(error);
    }
}

async function getSAVDetails() {
    try {
        await client.request.invokeTemplate("requestSAV", {
            context: {
                s: logiciel_identifiant,
                l: logiciel_licence
            }
        }).then(function (data) {
            displayStatus('success', 'Informations de licence récupérées');
            afficheInformationsSAV(data.response);
        }, function (error) {
            displayStatus('danger', 'Échec de la requête');
            console.log(error);
        });

    } catch (error) {
        // failure operation
        console.log(error);
    }
}

function writeToId(id, text, alert=false) {
    const textElement = document.getElementById(id);
    textElement.innerHTML = text;
    if (alert) textElement.classList.add("alert");
    else textElement.classList.remove("alert");
}

function showId(id) {
    const element = document.getElementById(id);
    element.style.display = 'block';
}

function hideId(id) {
    const element = document.getElementById(id);
    element.style.display = 'none';
}

function afficheTitre() {
    if (!logiciel_nom)
        writeToId('titre', "Nom du logiciel manquant");
    else {
        if (!logiciel_licence)
            writeToId('titre', "N° de licence manquant");
        else
            //writeToId('titre', logiciel_nom + " (" + logiciel_identifiant + ")<br>licence n°" + logiciel_licence);
            writeToId('titre', logiciel_nom + "<br>licence n°" + logiciel_licence);
    }
}

function chaineDate(laDate) {
    if (laDate==='2050-12-31') return "perpétuelle";
    else return (new Date(laDate).toLocaleDateString());
}

function chaineClef(type)
{
    const tableau = { 1 : "SuperPro", 2 : "LDK HL", 3 : "LDK SL", 99 : "Sans clef"};
    return tableau[type];
}
function afficheLien() {
    const Fiche_URL= "https://intranet.bbs-logiciels.com/wincli/licence.php";
    document.getElementById("lienfiche").href = Fiche_URL+'?s='+logiciel_identifiant+'&l='+logiciel_licence;
}

function decode_utf8(s)
{
    return decodeURI(escape(s));
}

function afficheInformations(Donnees) {

    //console.log(Donnees);

    const {
            infos : {
                nom,
                adresse: {ville}
            },
            version : {
                reseau,
                jetons,
                dateExpiration
            },
            droitMaJ : {
                actif,
                dateFin
            },
            clef    : {
                type,
                code,
                clehebergee
            }

    } = JSON.parse(Donnees);

    writeToId("societe", nom);
    writeToId("ville", ville);

    writeToId("validite", chaineDate(dateExpiration));

    if (actif==="1")
        writeToId("maintenance", "jusqu'au<br>"+chaineDate(dateFin));
    else
        writeToId("maintenance", "échue", true);

    if (reseau==="1")
        writeToId("reseau", "oui<br>"+jetons+" jetons");
    else
        writeToId("reseau", "non");

    if (clehebergee==="1")
        writeToId("clehebergee", "oui");
    else
        writeToId("clehebergee", "non");

    writeToId("typeclef", chaineClef(type));
    writeToId("codeclef", code);

    showId("donnees");
}

function afficheInformationsSAV(Donnees) {
    console.log(Donnees);
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
}

async function renderText() {

    /*
    const textElement = document.getElementById('apptext');
    const contactData = await client.data.get('contact');
    const {
      contact: { name }
    } = contactData;

    textElement.innerHTML = `Ticket is created by ${name}`;
     */
    hideId("donnees");
    await getTicketDetails();
    await getLicenceDetails();
    await getSAVDetails();
    client.instance.resize({ height: "400px" });
}