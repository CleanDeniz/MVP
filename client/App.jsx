import React, { useEffect, useState } from "react";
import Home from "./pages/Home.jsx";
import Catalog from "./pages/Catalog.jsx";
import MyServices from "./pages/MyServices.jsx";
import Admin from "./pages/Admin.jsx";
import { apiGET } from "./api.js";

const tabsBase = [
  { key: "home", title: "Баланс" },
  { key: "catalog", title: "Каталог" },
  { key: "my", title: "Мои услуги" }
];

export default function App() {
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("home");

  async function loadMe() {
    try {
      const res = await apiGET("/api/user/me");
      setMe(res.user ? { ...res.user, tg: res.tgUser } : { error: "no-user" });
    } catch {
      setMe({ error: "api-failed" });
    }
  }

  useEffect(() => {
    window.Telegram?.WebApp?.expand?.();
    loadMe();
  }, []);

  const isAdmin = me?.role === "admin";
  const tabs = isAdmin ? [...tabsBase, { key: "admin", title: "Админ" }] : tabsBase;

  return (
    <div>
      <div className="header">
        <div style={{ fontWeight: 800, letterSpacing: 0.5 }}>bonus.mini</div>
        <div className="nav">
          {tabs.map(t => (
            <button key={t.key} className={"btn" + (tab === t.key ? " primary" : "")} onClick={() => setTab(t.key)}>
              {t.title}
            </button>
          ))}
        </div>
      </div>

      <div className="container">
        {!me && <div className="card">Загрузка…</div>}
        {me && tab === "home" && <Home me={me} onUpdated={loadMe} />}
        {me && tab === "catalog" && <Catalog me={me} onUpdated={loadMe} />}
        {me && tab === "my" && <MyServices />}
        {me && isAdmin && tab === "admin" && <Admin />}
      </div>
    </div>
  );
}
