import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "../lib/supabase";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import DashboardContent from "../components/DashboardContent";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);


  useEffect(() => {

    async function checkUser() {

      const { data } = await supabase.auth.getSession();


      if (!data.session) {

        setLocation("/signup");
        return;

      }


      const email = data.session.user.email;


      if (email) {

        setUserEmail(email);

      }


      setLoading(false);

    }


    checkUser();


  }, [setLocation]);



  async function handleLogout() {

    await supabase.auth.signOut();

    setLocation("/signup");

  }



  if (loading) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-[#09090f]">

        <div className="text-center">

          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />

          <p className="text-slate-400">
            Loading Workivo...
          </p>

        </div>

      </div>

    );

  }



  return (

    <div className="flex min-h-screen bg-[#09090f] text-white">


      {/* Sidebar */}

      <Sidebar />



      {/* Main Area */}

      <div className="flex flex-1 flex-col">


        {/* Topbar */}

        <Topbar email={userEmail} />



        {/* Content */}

        <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">


          <DashboardContent />


        </main>



      </div>


    </div>

  );

}
