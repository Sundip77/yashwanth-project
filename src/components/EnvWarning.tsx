import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const hasEnv = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

export function EnvWarning() {
  if (hasEnv) return null;

  return (
    <div className="p-4">
      <Alert variant="destructive">
        <AlertTitle>Missing environment configuration</AlertTitle>
        <AlertDescription>
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in a
          <code>.env.local</code> file at the project root, then restart the dev server.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default EnvWarning;


