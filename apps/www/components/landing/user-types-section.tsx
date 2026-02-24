"use client";

import { Code2, Server, Users } from "lucide-react";

export function UserTypesSection() {
  return (
    <div className="border-y border-border bg-background">
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 divide-x divide-border border-x border-border">
        <div className="p-12 hover:bg-secondary transition-colors">
          <Code2 className="w-10 h-10 text-primary mb-6" />
          <h3 className="text-xl font-bold text-foreground mb-3">Developers</h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Consolidate multiple SDK instances into one simple API. Build
            powerful applications without managing credentials.
          </p>
          <a
            href="#"
            className="text-sm font-medium text-primary hover:underline"
          >
            View API Docs →
          </a>
        </div>
        <div className="p-12 hover:bg-secondary transition-colors">
          <Users className="w-10 h-10 text-primary mb-6" />
          <h3 className="text-xl font-bold text-foreground mb-3">Teams</h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Manage cross-provider assets without credential leakage. Collaborate
            securely with granular permissions.
          </p>
          <a
            href="#"
            className="text-sm font-medium text-primary hover:underline"
          >
            Team Features →
          </a>
        </div>
        <div className="p-12 hover:bg-secondary transition-colors">
          <Server className="w-10 h-10 text-primary mb-6" />
          <h3 className="text-xl font-bold text-foreground mb-3">
            Self-Hosted
          </h3>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Integrate NAS nodes with cloud mirror protocols. Full control over
            your infrastructure.
          </p>
          <a
            href="#"
            className="text-sm font-medium text-primary hover:underline"
          >
            Self-Host Options →
          </a>
        </div>
      </div>
    </div>
  );
}
