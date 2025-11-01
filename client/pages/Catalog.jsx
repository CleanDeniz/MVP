import React, { useEffect, useState } from "react";
import { apiGET, apiPOST } from "../api.js";

export default function Catalog({ onUpdated }) {
  const [items, setItems] = useState([]);

  async function load() {
    try {
      const res = await apiGET("/api/services");
      setItems(res.services || []);
    } catch {
      setItems([]);
    }
  }

  async function buy(id) {
    try {
      await apiPOST("/api/user/redeem", { serviceId: id });
      alert("Услуга куплена");
      onUpdated?.();
    } catch (e) {
      alert("Ошибка покупки");
    }
  }

  useEffect(() => { load(); }, []);

  if (!items.length) return <div className="empty">Пока услуг нет</div>;

  return (
    <div className="grid">
      {items.map(s => (
        <div key={s.id} className="card">
          <div className="row">
            <div>
              <b>{s.title}</b>
              <div style={{ color: "#aaa", fontSize: 12 }}>{s.partner}</div>
              {s.description && <div style={{ marginTop: 6, color: "#ccc" }}>{s.description}</div>}
            </div>
            <div className="btn primary" onClick={() => buy(s.id)}>{s.price} б.</div>
          </div>
        </div>
      ))}
    </div>
  );
}
