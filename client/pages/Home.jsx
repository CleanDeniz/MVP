import React, { useState } from "react";
import { apiPOST } from "../api.js";

export default function Home({ me, onUpdated }) {
  const [phone, setPhone] = useState(me?.phone || "");

  async function savePhone() {
    if (!phone) return alert("Введите телефон");
    try {
      await apiPOST("/api/user/phone", { phone });
      alert("Телефон сохранён");
      onUpdated?.();
    } catch {
      alert("Ошибка сохранения");
    }
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="row">
          <div>
            <div style={{ color: "#aaa", fontSize: 12 }}>Баланс</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{me?.balance ?? 0} б.</div>
          </div>
          <div className="btn ghost" onClick={onUpdated}>Обновить</div>
        </div>
      </div>

      <div className="card">
        <h3>Номер телефона</h3>
        <input placeholder="+7..." value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button className="btn primary" onClick={savePhone}>Сохранить</button>
      </div>
    </div>
  );
}
