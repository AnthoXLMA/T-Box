import { useState } from "react";
import { auth } from "../firebase"; // ton instance Firebase

function DeleteAccountButton() {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) return;

    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/delete-user`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Erreur suppression compte");

      alert("Votre compte a été supprimé avec succès !");
      // Déconnexion
      await auth.signOut();
      window.location.href = "/"; // ou page d'accueil
    } catch (err) {
      console.error(err);
      alert("Impossible de supprimer le compte : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleDelete} disabled={loading} className="btn btn-danger">
      {loading ? "Suppression..." : "Supprimer mon compte"}
    </button>
  );
}

export default DeleteAccountButton;
