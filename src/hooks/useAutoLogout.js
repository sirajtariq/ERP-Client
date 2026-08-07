import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_EVENTS = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"];

const useAutoLogout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const doLogout = async () => {
      await logout();
      navigate("/login");
    };

    const resetTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(doLogout, TIMEOUT_MS);
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
};

export default useAutoLogout;
