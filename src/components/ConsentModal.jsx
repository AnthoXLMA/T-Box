import { useState } from "react";

export default function ConsentForm({ onSubmit }) {
  const [emailMarketing, setEmailMarketing] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = () => {
    if (!acceptedTerms) return alert("Vous devez accepter les conditions pour continuer");
    const consent = {
      emailMarketing,
      termsAcceptedAt: new Date().toISOString(),
    };
    onSubmit(consent);
  };

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={e => setAcceptedTerms(e.target.checked)}
        />
        J'accepte les conditions d'utilisation
      </label>
      <br/>
      <label>
        <input
          type="checkbox"
          checked={emailMarketing}
          onChange={e => setEmailMarketing(e.target.checked)}
        />
        Je souhaite recevoir des emails marketing
      </label>
      <br/>
      <button onClick={handleSubmit}>Valider</button>
    </div>
  );
}

