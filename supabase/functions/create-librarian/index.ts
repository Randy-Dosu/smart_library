import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LIBRARIAN_DOMAIN = "lib.knust.edu.gh";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    // Verify the caller is an authenticated librarian
    const { data: caller, error: callerErr } = await supabase.auth.getUser();
    if (callerErr || !caller?.user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const callerId = caller.user.id;
    const { data: callerProfile, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .maybeSingle();

    if (profErr || !callerProfile || callerProfile.role !== "librarian") {
      return new Response(
        JSON.stringify({ ok: false, error: "Only librarians can create librarian accounts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const username = (body?.username ?? "").toString().trim().toLowerCase();
    const password = (body?.password ?? "").toString();
    const fullName = (body?.full_name ?? "").toString().trim();
    const department = (body?.department ?? "").toString().trim();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ ok: false, error: "Username and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ ok: false, error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Reject usernames that already contain a domain part
    if (username.includes("@")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Enter a username only, not a full email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const email = `${username}@${LIBRARIAN_DOMAIN}`;

    // Use service role to create the user (admin_created flag bypasses the
    // self-registration block in handle_new_user).
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "librarian", full_name: fullName, department },
      app_metadata: { role: "librarian", admin_created: "true" },
    });

    if (createErr) {
      return new Response(
        JSON.stringify({ ok: false, error: createErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Librarian account created successfully",
        email_masked: `${username}@•••.knust.edu.gh`,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
