import React from "react";

export default function Footer() {
  return (
    <footer className="bg-gray-100 text-gray-700 p-4 mt-8 border-t">
      <div className="container mx-auto text-center">
        © {new Date().getFullYear()} TipBox. Tous droits réservés.
      </div>
    </footer>
  );
}
