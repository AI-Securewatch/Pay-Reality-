import { User, Bell, Shield, Key } from "lucide-react";
import { motion } from "motion/react";

const sections = [
  { name: "Profile Settings", icon: User, description: "Manage your account and preferences" },
  { name: "Notifications", icon: Bell, description: "Configure alert preferences" },
  { name: "Security", icon: Shield, description: "Two-factor authentication and access controls" },
  { name: "API Keys", icon: Key, description: "Manage integration credentials" },
];

export function Settings() {
  return (
    <div className="p-8" style={{ backgroundColor: 'var(--pr-bg-primary)', minHeight: '100vh' }}>
      <div className="mb-8">
        <h1 className="mb-2" style={{ color: 'var(--pr-text-primary)' }}>Settings</h1>
        <p style={{ color: 'var(--pr-text-muted)' }}>Manage your PayReality configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <motion.button
              key={section.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => alert(`Open ${section.name}`)}
              className="p-6 rounded-2xl border text-left transition-all"
              style={{ 
                backgroundColor: 'var(--pr-bg-card)', 
                borderColor: 'rgba(255,255,255,0.05)' 
              }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(77, 124, 254, 0.1)' }}>
                <Icon className="w-6 h-6" style={{ color: 'var(--pr-authority-blue)' }} />
              </div>
              <h3 className="mb-2" style={{ color: 'var(--pr-text-primary)' }}>{section.name}</h3>
              <p className="text-sm" style={{ color: 'var(--pr-text-muted)' }}>{section.description}</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
