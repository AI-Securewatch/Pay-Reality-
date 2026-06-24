import { useRef, useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { motion, useInView } from "motion/react";
import {
  Compass,
  Shield,
  FileText,
  GitBranch,
  CheckCircle,
  Database,
  Building2,
  Bot,
  Upload,
  Play,
  ArrowRight,
  XCircle,
  Sparkles,
  FileCode,
  Layers,
  ChevronDown,
} from "lucide-react";
import { useDemo, getDashboardMetrics } from "../demo/DemoContext";
import { useNotify } from "../components/NotificationProvider";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function Section({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(progress * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

const FLOW_STEPS = [
  {
    id: "docs",
    label: "Governance Documents",
    icon: FileText,
    description: "Upload delegation policies, treasury controls, and governance frameworks to establish authority baselines.",
  },
  {
    id: "discovery",
    label: "Control Discovery",
    icon: Sparkles,
    description: "Document intelligence extracts enforceable controls, approval chains, and authority limits.",
  },
  {
    id: "policy",
    label: "Policy Library",
    icon: FileCode,
    description: "Translate discovered controls into active policies with policy sets and visual composition.",
  },
  {
    id: "simulation",
    label: "Governance Simulation",
    icon: Play,
    description: "Test authority, policies, and governance outcomes before deployment with multiple simulation types.",
  },
  {
    id: "decision",
    label: "AI Decision",
    icon: Bot,
    description: "AI agents initiate actions — payments, vendor onboarding, payroll changes, and operational workflows.",
  },
  {
    id: "intercept",
    label: "Decision Intercept",
    icon: GitBranch,
    description: "Validates AI actions before execution and determines whether authority exists for the requested action.",
  },
  {
    id: "approval",
    label: "Approval Workflow",
    icon: CheckCircle,
    description: "Routes high-risk actions to human approvers when authority thresholds or controls are exceeded.",
  },
  {
    id: "evidence",
    label: "Evidence Vault",
    icon: Database,
    description: "Generates immutable, cryptographically verifiable records of every governed decision.",
  },
  {
    id: "assurance",
    label: "Assurance Center",
    icon: Building2,
    description: "Measures governance assurance, auditability, evidence completeness, and compliance readiness.",
  },
];

const MODULES = [
  {
    title: "AI Authority Command Center",
    description: "Executive visibility into autonomous authority.",
    icon: Compass,
    path: "/command-center",
    color: "var(--pr-authority-blue)",
  },
  {
    title: "AI Agents Registry",
    description: "Manage identities of autonomous AI agents.",
    icon: Bot,
    path: "/ai-agents",
    color: "var(--pr-authority-blue)",
  },
  {
    title: "Authority Center",
    description: "Define delegated authority structures.",
    icon: Shield,
    path: "/authority-center",
    color: "var(--pr-authority-blue)",
  },
  {
    title: "Policy Library",
    description: "Central governance repository with policy sets.",
    icon: FileCode,
    path: "/policy-center",
    color: "var(--pr-verification-purple)",
  },
  {
    title: "Governance Simulation Engine",
    description: "Test authority, policies, and governance outcomes.",
    icon: Play,
    path: "/governance-simulation",
    color: "var(--pr-evidence-cyan)",
  },
  {
    title: "Decision Intercepts",
    description: "Validate AI actions before execution.",
    icon: GitBranch,
    path: "/decision-intercepts",
    color: "var(--pr-warning-amber)",
  },
  {
    title: "Evidence Vault",
    description: "Permanent repository of decision evidence and accountability records.",
    icon: Database,
    path: "/evidence-vault",
    color: "var(--pr-trust-green)",
  },
  {
    title: "Assurance Center",
    description: "Auditability and governance assurance.",
    icon: Building2,
    path: "/insurance-readiness",
    color: "var(--pr-verification-purple)",
  },
];

const WITHOUT_ITEMS = [
  "AI initiates action",
  "No authority validation",
  "Governance uncertainty",
  "Compliance risk",
  "Financial exposure",
];

const WITH_ITEMS = [
  "Authority verified",
  "Controls evaluated",
  "Approvals enforced",
  "Evidence generated",
  "Insurance readiness improved",
];

const DEMO_JOURNEY = [
  {
    step: 1,
    title: "Upload Governance Documents",
    description: "Start by ingesting delegation of authority, treasury controls, and procurement policies.",
    action: "Go to Policy Library",
    path: "/policy-center",
    progressKey: "documents" as const,
  },
  {
    step: 2,
    title: "Generate Controls & Policies",
    description: "Document intelligence extracts enforceable controls and activates the policy library.",
    action: "View Policies",
    path: "/policy-center",
    progressKey: "policies" as const,
  },
  {
    step: 3,
    title: "Run Governance Simulation",
    description: "Test authority, policies, and governance outcomes with the simulation engine.",
    action: "Run Simulation",
    path: "/governance-simulation",
    progressKey: "simulation" as const,
  },
  {
    step: 4,
    title: "Run AI Scenario",
    description: "Execute a treasury, vendor, or payroll scenario to see authority enforcement in action.",
    action: "Run Treasury Demo",
    scenario: "treasury" as const,
    path: "/decision-intercepts",
    progressKey: "intercepts" as const,
  },
  {
    step: 5,
    title: "Review Evidence & Assurance",
    description: "Inspect verifiable evidence artifacts and observe governance assurance metrics.",
    action: "Review Assurance",
    path: "/insurance-readiness",
    progressKey: "insurance" as const,
  },
];

function FloatingNodes() {
  const nodes = [
    { x: "12%", y: "18%", delay: 0 },
    { x: "78%", y: "22%", delay: 0.4 },
    { x: "85%", y: "62%", delay: 0.8 },
    { x: "18%", y: "72%", delay: 1.2 },
    { x: "50%", y: "12%", delay: 0.6 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {nodes.map((node, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full"
          style={{
            left: node.x,
            top: node.y,
            backgroundColor: "var(--pr-authority-blue)",
            boxShadow: "0 0 24px rgba(77,124,254,0.4)",
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.2, 1],
            y: [0, -8, 0],
          }}
          transition={{
            duration: 4,
            delay: node.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(77,124,254,0.08) 0%, transparent 70%)",
        }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export function PlatformOverview() {
  const navigate = useNavigate();
  const { state, runScenario, scenarioRunning } = useDemo();
  const notify = useNotify();
  const metrics = getDashboardMetrics(state);
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);

  const journeyProgress = {
    documents: state.documents.length > 0,
    policies: state.policies.length > 0,
    simulation: true,
    intercepts: state.intercepts.length > 0,
    insurance: state.insurance.score > 0,
  };

  const handleScenario = async (type: "treasury" | "enterprise") => {
    notify.info(`Starting ${type} scenario...`);
    await runScenario(type);
    notify.success(`${type.charAt(0).toUpperCase() + type.slice(1)} scenario complete`);
    navigate(type === "treasury" ? "/decision-intercepts" : "/dashboard");
  };

  const cardStyle = {
    backgroundColor: "var(--pr-bg-card)",
    borderColor: "rgba(255,255,255,0.05)",
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--pr-bg-primary)" }}
    >
      {/* SECTION 1 — HERO */}
      <section className="relative px-8 pt-12 pb-20 overflow-hidden">
        <FloatingNodes />
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 border"
            style={{
              backgroundColor: "rgba(77,124,254,0.08)",
              borderColor: "rgba(77,124,254,0.25)",
            }}
          >
            <Compass className="w-4 h-4" style={{ color: "var(--pr-authority-blue)" }} />
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--pr-authority-blue)" }}>
              Platform Overview
            </span>
          </motion.div>

          <motion.h1
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl md:text-5xl font-semibold mb-4 leading-tight"
            style={{ color: "var(--pr-text-primary)" }}
          >
            PayReality is the Authority Layer for AI
          </motion.h1>

          <motion.p
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-xl mb-3"
            style={{ color: "var(--pr-authority-blue)" }}
          >
            Traditional security proves identity.
            <br />
            PayReality proves authority.
          </motion.p>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-base max-w-2xl mx-auto mb-4 leading-relaxed"
            style={{ color: "var(--pr-text-secondary)" }}
          >
            As AI systems gain the ability to move money, approve purchases, modify payroll, onboard vendors,
            and execute business operations, organizations need infrastructure that can verify authority before
            actions occur.
          </motion.p>

          <motion.p
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-sm max-w-2xl mx-auto"
            style={{ color: "var(--pr-text-muted)" }}
          >
            PayReality enforces governance controls, validates authority, generates evidence, and improves AI
            insurability.
          </motion.p>

          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap justify-center gap-6 mt-10"
          >
            {[
              { label: "Active Agents", value: metrics.activeAgents },
              { label: "Policies", value: metrics.policies },
              { label: "Governance Coverage", value: metrics.governanceCoverage },
              { label: "Insurance Score", value: `${metrics.insuranceScore}/100` },
            ].map((stat) => (
              <div
                key={stat.label}
                className="px-6 py-4 rounded-2xl border min-w-[140px]"
                style={cardStyle}
              >
                <p className="text-2xl font-mono font-semibold mb-1" style={{ color: "var(--pr-authority-blue)" }}>
                  {typeof stat.value === "number" ? (
                    <CountUp value={stat.value} />
                  ) : (
                    stat.value
                  )}
                </p>
                <p className="text-xs" style={{ color: "var(--pr-text-muted)" }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* SECTION 2 — THE PROBLEM */}
      <Section className="px-8 py-16">
        <motion.h2
          variants={fadeUp}
          custom={0}
          className="text-2xl font-semibold text-center mb-10"
          style={{ color: "var(--pr-text-primary)" }}
        >
          The Authority Gap
        </motion.h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <motion.div variants={fadeUp} custom={0} className="p-6 rounded-3xl border" style={cardStyle}>
            <div className="flex items-center gap-2 mb-6">
              <XCircle className="w-5 h-5" style={{ color: "var(--pr-critical-red)" }} />
              <h3 className="font-semibold" style={{ color: "var(--pr-text-primary)" }}>
                Without PayReality
              </h3>
            </div>
            <ul className="space-y-3">
              {WITHOUT_ITEMS.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 text-sm"
                  style={{ color: "var(--pr-text-secondary)" }}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--pr-critical-red)" }} />
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            variants={fadeUp}
            custom={1}
            className="p-6 rounded-3xl border relative overflow-hidden"
            style={{
              ...cardStyle,
              borderColor: "rgba(77,124,254,0.2)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(circle at top right, rgba(77,124,254,0.06) 0%, transparent 60%)",
              }}
            />
            <div className="flex items-center gap-2 mb-6 relative">
              <Shield className="w-5 h-5" style={{ color: "var(--pr-trust-green)" }} />
              <h3 className="font-semibold" style={{ color: "var(--pr-text-primary)" }}>
                With PayReality
              </h3>
            </div>
            <ul className="space-y-3 relative">
              {WITH_ITEMS.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 text-sm"
                  style={{ color: "var(--pr-text-secondary)" }}
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--pr-trust-green)" }} />
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </Section>

      {/* SECTION 3 — HOW IT WORKS */}
      <Section className="px-8 py-16">
        <motion.div variants={fadeUp} custom={0} className="text-center mb-12">
          <h2 className="text-2xl font-semibold mb-2" style={{ color: "var(--pr-text-primary)" }}>
            How It Works
          </h2>
          <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
            From governance documents to insurable AI operations
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {FLOW_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isHovered = hoveredStep === step.id;
            const isActive = activeFlowIndex === index;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                onHoverStart={() => {
                  setHoveredStep(step.id);
                  setActiveFlowIndex(index);
                }}
                onHoverEnd={() => setHoveredStep(null)}
                className="relative"
              >
                <motion.div
                  className="p-5 rounded-2xl border mb-2 cursor-default transition-all duration-300"
                  style={{
                    backgroundColor: isHovered || isActive ? "rgba(77,124,254,0.06)" : "var(--pr-bg-card)",
                    borderColor: isHovered ? "var(--pr-authority-blue)" : "rgba(255,255,255,0.05)",
                    boxShadow: isHovered ? "0 0 32px rgba(77,124,254,0.12)" : "none",
                  }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: isHovered ? "rgba(77,124,254,0.15)" : "rgba(77,124,254,0.08)",
                      }}
                      animate={isHovered ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 1.5, repeat: isHovered ? Infinity : 0 }}
                    >
                      <Icon className="w-5 h-5" style={{ color: "var(--pr-authority-blue)" }} />
                    </motion.div>
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: "var(--pr-text-primary)" }}>
                        {step.label}
                      </p>
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{
                          height: isHovered ? "auto" : 0,
                          opacity: isHovered ? 1 : 0,
                        }}
                        className="text-sm overflow-hidden mt-1"
                        style={{ color: "var(--pr-text-muted)" }}
                      >
                        {step.description}
                      </motion.p>
                    </div>
                  </div>
                </motion.div>

                {index < FLOW_STEPS.length - 1 && (
                  <div className="flex justify-center py-1">
                    <motion.div
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 + 0.2, duration: 0.4 }}
                      className="flex flex-col items-center origin-top"
                    >
                      <div className="w-px h-6" style={{ backgroundColor: "rgba(77,124,254,0.3)" }} />
                      <ChevronDown className="w-4 h-4" style={{ color: "var(--pr-authority-blue)", opacity: 0.5 }} />
                    </motion.div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* SECTION 4 — INTERACTIVE DEMO JOURNEY */}
      <Section className="px-8 py-16">
        <motion.div variants={fadeUp} custom={0} className="text-center mb-10">
          <h2 className="text-2xl font-semibold mb-2" style={{ color: "var(--pr-text-primary)" }}>
            Interactive Demo Journey
          </h2>
          <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
            Follow these steps to experience the full platform narrative
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {DEMO_JOURNEY.map((item, index) => {
            const done = journeyProgress[item.progressKey];
            return (
              <motion.div
                key={item.step}
                variants={fadeUp}
                custom={index}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="p-6 rounded-3xl border flex flex-col"
                style={cardStyle}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="text-xs font-mono px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: done ? "rgba(34,197,94,0.1)" : "rgba(77,124,254,0.1)",
                      color: done ? "var(--pr-trust-green)" : "var(--pr-authority-blue)",
                    }}
                  >
                    Step {item.step}
                  </span>
                  {done && <CheckCircle className="w-4 h-4" style={{ color: "var(--pr-trust-green)" }} />}
                </div>
                <h3 className="font-semibold mb-2" style={{ color: "var(--pr-text-primary)" }}>
                  {item.title}
                </h3>
                <p className="text-sm flex-1 mb-5" style={{ color: "var(--pr-text-muted)" }}>
                  {item.description}
                </p>
                <div className="h-1 rounded-full mb-4 overflow-hidden" style={{ backgroundColor: "var(--pr-bg-hover)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: done ? "var(--pr-trust-green)" : "var(--pr-authority-blue)" }}
                    initial={{ width: 0 }}
                    animate={{ width: done ? "100%" : "8%" }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                {item.scenario ? (
                  <button
                    type="button"
                    disabled={scenarioRunning}
                    onClick={() => handleScenario(item.scenario!)}
                    className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
                  >
                    <Play className="w-4 h-4" />
                    {item.action}
                  </button>
                ) : (
                  <Link
                    to={item.path}
                    className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                    style={{
                      backgroundColor: "rgba(77,124,254,0.1)",
                      color: "var(--pr-authority-blue)",
                    }}
                  >
                    {item.action}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* SECTION 5 — PLATFORM MODULES */}
      <Section className="px-8 py-16">
        <motion.div variants={fadeUp} custom={0} className="text-center mb-10">
          <h2 className="text-2xl font-semibold mb-2" style={{ color: "var(--pr-text-primary)" }}>
            Platform Modules
          </h2>
          <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
            Connected enterprise governance infrastructure
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {MODULES.map((mod, index) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.title}
                variants={fadeUp}
                custom={index}
              >
                <Link to={mod.path}>
                  <motion.div
                    whileHover={{
                      y: -3,
                      boxShadow: "0 8px 32px rgba(77,124,254,0.12)",
                    }}
                    className="p-5 rounded-2xl border h-full transition-colors duration-300 group"
                    style={cardStyle}
                  >
                    <motion.div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${mod.color}15` }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Icon className="w-5 h-5" style={{ color: mod.color }} />
                    </motion.div>
                    <h3 className="font-semibold mb-1 group-hover:opacity-90" style={{ color: "var(--pr-text-primary)" }}>
                      {mod.title}
                    </h3>
                    <p className="text-sm" style={{ color: "var(--pr-text-muted)" }}>
                      {mod.description}
                    </p>
                    <div
                      className="mt-4 h-px w-0 group-hover:w-full transition-all duration-500"
                      style={{ backgroundColor: mod.color, opacity: 0.4 }}
                    />
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* SECTION 6 — WHY THIS MATTERS */}
      <Section className="px-8 py-16">
        <motion.div
          variants={fadeUp}
          custom={0}
          className="max-w-4xl mx-auto p-10 rounded-3xl border relative overflow-hidden"
          style={{
            ...cardStyle,
            borderColor: "rgba(139,92,246,0.15)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 70%)",
            }}
          />
          <div className="relative">
            <Layers className="w-8 h-8 mb-4" style={{ color: "var(--pr-verification-purple)" }} />
            <h2 className="text-3xl font-semibold mb-6" style={{ color: "var(--pr-text-primary)" }}>
              The Future Needs Verifiable Authority
            </h2>
            <p className="text-base mb-4 leading-relaxed" style={{ color: "var(--pr-text-secondary)" }}>
              AI systems will soon execute billions of dollars of transactions on behalf of organizations.
            </p>
            <p className="text-base mb-6 font-medium" style={{ color: "var(--pr-authority-blue)" }}>
              Identity alone is not enough.
            </p>
            <p className="text-sm mb-4" style={{ color: "var(--pr-text-muted)" }}>
              Organizations must be able to prove:
            </p>
            <ul className="space-y-3 mb-6">
              {[
                "Who acted",
                "What authority existed",
                "Why the action was allowed",
                "What evidence supports the decision",
              ].map((point, i) => (
                <motion.li
                  key={point}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 text-sm"
                  style={{ color: "var(--pr-text-secondary)" }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-mono"
                    style={{
                      backgroundColor: "rgba(77,124,254,0.12)",
                      color: "var(--pr-authority-blue)",
                    }}
                  >
                    {i + 1}
                  </div>
                  {point}
                </motion.li>
              ))}
            </ul>
            <p className="text-base font-medium" style={{ color: "var(--pr-text-primary)" }}>
              PayReality provides that trust layer.
            </p>
          </div>
        </motion.div>
      </Section>

      {/* SECTION 7 — START DEMO */}
      <Section className="px-8 py-20 pb-24">
        <motion.div
          variants={fadeUp}
          custom={0}
          className="max-w-3xl mx-auto p-10 rounded-3xl border text-center relative overflow-hidden"
          style={{
            ...cardStyle,
            borderColor: "rgba(77,124,254,0.2)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at center, rgba(77,124,254,0.1) 0%, transparent 65%)",
            }}
          />
          <div className="relative">
            <h2 className="text-2xl font-semibold mb-3" style={{ color: "var(--pr-text-primary)" }}>
              Ready to Experience PayReality?
            </h2>
            <p className="text-sm mb-8" style={{ color: "var(--pr-text-muted)" }}>
              Start with document onboarding or run a live governance scenario
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/policy-center"
                className="px-6 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                style={{ backgroundColor: "var(--pr-authority-blue)", color: "#fff" }}
              >
                <Upload className="w-4 h-4" />
                Upload to Policy Library
              </Link>
              <button
                type="button"
                disabled={scenarioRunning}
                onClick={() => handleScenario("treasury")}
                className="px-6 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition-all disabled:opacity-50"
                style={{
                  borderColor: "rgba(77,124,254,0.3)",
                  color: "var(--pr-authority-blue)",
                  backgroundColor: "rgba(77,124,254,0.08)",
                }}
              >
                <Play className="w-4 h-4" />
                Run Treasury Scenario
              </button>
              <button
                type="button"
                disabled={scenarioRunning}
                onClick={() => handleScenario("enterprise")}
                className="px-6 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border transition-all disabled:opacity-50"
                style={{
                  borderColor: "rgba(139,92,246,0.3)",
                  color: "var(--pr-verification-purple)",
                  backgroundColor: "rgba(139,92,246,0.08)",
                }}
              >
                <Building2 className="w-4 h-4" />
                Run Enterprise Scenario
              </button>
            </div>
            <p className="text-xs mt-6" style={{ color: "var(--pr-text-disabled)" }}>
              Or explore the{" "}
              <Link to="/dashboard" style={{ color: "var(--pr-authority-blue)" }}>
                Executive Dashboard
              </Link>{" "}
              for live platform metrics
            </p>
          </div>
        </motion.div>
      </Section>
    </div>
  );
}
