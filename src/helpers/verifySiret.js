import fetch from "node-fetch";

export async function verifySiret(siret) {
  if (!siret || !/^\d{14}$/.test(siret)) {
    throw new Error("SIRET invalide");
  }

  const response = await fetch(`https://api.insee.fr/entreprises/siret/${siret}`, {
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${process.env.INSEE_API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Erreur API INSEE : ${response.statusText}`);
  }

  const data = await response.json();

  if (!data || !data.etablissement) {
    throw new Error("Entreprise non trouvée");
  }

  return {
    name: data.etablissement.uniteLegale?.denominationUniteLegale || "N/A",
    address: data.etablissement.adresseEtablissement?.libelleVoie || "N/A",
    siret
  };
}
