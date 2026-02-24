import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
	HardDrive,
	Cloud,
	Server,
	Database,
	Shield,
	Activity,
	Search,
	Layout,
	Lock,
	Terminal,
	ChevronRight,
	Menu,
	X,
	Zap,
	Cpu,
	Globe,
	Users,
	Layers,
	ArrowRight,
} from "lucide-react";

// --- Components ---

const Badge = ({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) => (
	<span
		className={`inline-flex items-center px-2 py-1 text-[10px] font-mono uppercase tracking-wider border border-blue-900 text-blue-500 ${className}`}
	>
		{children}
	</span>
);

const Button = ({
	children,
	variant = "primary",
	className = "",
	icon: Icon,
}: {
	children: React.ReactNode;
	variant?: "primary" | "secondary" | "outline";
	className?: string;
	icon?: React.ElementType;
}) => {
	const baseStyles =
		"inline-flex items-center justify-center px-6 py-3 text-sm font-medium transition-colors duration-200 focus:outline-none";
	const variants = {
		primary:
			"bg-blue-600 hover:bg-blue-700 text-white border border-transparent rounded-sm",
		secondary:
			"bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-sm",
		outline:
			"bg-transparent hover:bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-sm",
	};

	return (
		<button className={`${baseStyles} ${variants[variant]} ${className}`}>
			{Icon && <Icon className="w-4 h-4 mr-2" />}
			{children}
		</button>
	);
};

const Section = ({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) => (
	<section
		className={`py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto ${className}`}
	>
		{children}
	</section>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
	children,
	className = "",
}) => (
	<div
		className={`bg-black border border-zinc-800 p-6 hover:border-zinc-600 transition-colors ${className}`}
	>
		{children}
	</div>
);

// --- Main App ---

export default function App() {
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => setIsScrolled(window.scrollY > 20);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-blue-900 selection:text-white">
			{/* Grid Background Pattern */}
			<div
				className="fixed inset-0 pointer-events-none z-0 opacity-20"
				style={{
					backgroundImage:
						"linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",
					backgroundSize: "40px 40px",
				}}
			/>

			{/* Navigation */}
			<nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-800">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center space-x-4">
							<div className="w-8 h-8 bg-blue-600 flex items-center justify-center rounded-sm">
								<Layers className="w-5 h-5 text-white" />
							</div>
							<span className="text-white font-bold text-lg tracking-tight">
								Drivebase
							</span>
							<div className="h-4 w-px bg-zinc-800 mx-4" />
							<span className="hidden sm:inline-block text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
								System Status: Operational
							</span>
						</div>

						<div className="hidden md:flex items-center space-x-8">
							<a
								href="#"
								className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
							>
								Features
							</a>
							<a
								href="#"
								className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
							>
								Solutions
							</a>
							<a
								href="#"
								className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
							>
								Docs
							</a>
							<a
								href="#"
								className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors"
							>
								Changelog
							</a>
						</div>

						<div className="hidden md:flex items-center space-x-4">
							<button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
								Sign In
							</button>
							<Button variant="primary" className="py-2 px-4 text-xs">
								Get Started
							</Button>
						</div>
					</div>
				</div>
			</nav>

			{/* Hero Section */}
			<div className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 border-b border-zinc-800 bg-black z-10">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-12 gap-12 items-center">
						<div className="lg:col-span-7">
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5 }}
								className="mb-8"
							>
								<Badge>Unified Storage Interface 2.0</Badge>
							</motion.div>

							<motion.h1
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: 0.1 }}
								className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6 leading-none"
							>
								INITIATING <br />
								UNIFIED_LAYER
							</motion.h1>

							<motion.p
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: 0.2 }}
								className="max-w-xl text-lg text-zinc-500 mb-10 leading-relaxed font-mono"
							>
								LOG: INTEGRATING GOOGLE_DRIVE, AWS_S3, AND LOCAL_STORAGE INTO A
								SINGLE ADDRESSABLE DATA LAYER.
							</motion.p>

							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: 0.3 }}
								className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4"
							>
								<Button
									variant="outline"
									icon={ChevronRight}
									className="w-full sm:w-auto border-blue-600 text-blue-500 hover:bg-blue-900/20"
								>
									START_SESSION
								</Button>
								<Button
									variant="outline"
									icon={Terminal}
									className="w-full sm:w-auto"
								>
									VIEW_SYS_LOGS
								</Button>
							</motion.div>
						</div>

						{/* Technical Diagram / Hero Image Placeholder */}
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.8, delay: 0.4 }}
							className="lg:col-span-5"
						>
							<div className="aspect-square border border-zinc-800 bg-zinc-900/20 p-2 relative">
								{/* Decorative corners */}
								<div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-blue-500" />
								<div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-blue-500" />
								<div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-blue-500" />
								<div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-blue-500" />

								<div className="w-full h-full bg-black border border-zinc-800 flex items-center justify-center relative overflow-hidden">
									{/* Scanline effect */}
									<div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20" />

									<div className="text-center space-y-4 relative z-10">
										<div className="w-32 h-32 mx-auto border border-zinc-700 rounded-full flex items-center justify-center relative">
											<div className="absolute inset-0 border border-zinc-800 rounded-full animate-[spin_10s_linear_infinite]" />
											<div className="absolute inset-2 border border-dashed border-zinc-800 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
											<Activity className="w-8 h-8 text-blue-500" />
										</div>
										<div className="font-mono text-xs text-zinc-500">
											<div>STATUS: ONLINE</div>
											<div>LATENCY: 12ms</div>
											<div>ENCRYPTION: AES-256</div>
										</div>
									</div>
								</div>
							</div>
							<div className="mt-2 text-[10px] font-mono text-zinc-600 text-right">
								IMG_REF_ID: 6EE148F7C3D84448A36A780270924B1F //
								DISPLAY_BUFFER_01
							</div>
						</motion.div>
					</div>
				</div>
			</div>

			{/* Status Bar - Grid Layout */}
			<div className="border-b border-zinc-800 bg-black z-10 relative">
				<div className="max-w-7xl mx-auto">
					<div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-zinc-800 border-x border-zinc-800">
						{[
							{ label: "G_DRIVE", status: "READY", icon: Cloud },
							{ label: "AWS_S3", status: "READY", icon: Database },
							{ label: "LOCAL_DISK", status: "READY", icon: HardDrive },
							{ label: "AZURE_BLOB", status: "READY", icon: Server },
						].map((item, i) => (
							<div
								key={i}
								className="p-4 flex items-center space-x-3 group hover:bg-zinc-900 transition-colors cursor-default"
							>
								<div className="w-2 h-2 bg-zinc-600 group-hover:bg-emerald-500 transition-colors" />
								<item.icon className="w-4 h-4 text-zinc-500" />
								<div className="text-xs font-mono text-zinc-400">
									<span className="text-zinc-300 font-bold mr-2">
										{item.label}:
									</span>
									{item.status}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Problem / Solution - Split Layout */}
			<div className="border-b border-zinc-800 bg-black z-10 relative">
				<div className="max-w-7xl mx-auto grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800 border-x border-zinc-800">
					{/* Left: Problem */}
					<div className="p-12 lg:p-16">
						<div className="flex items-center space-x-2 text-red-500 mb-6 font-mono text-xs uppercase tracking-wider">
							<span className="w-2 h-2 bg-red-500" />
							<span>[!] Error: Fragmentation_Detected</span>
						</div>
						<h2 className="text-3xl font-bold text-white mb-8 font-mono">
							COMPLEXITY_OVERLOAD
						</h2>
						<ul className="space-y-6 font-mono text-sm text-zinc-400">
							<li className="flex items-start">
								<span className="text-red-500 mr-4">[x]</span>
								API_LATENCY: EXPONENTIAL_GROWTH
							</li>
							<li className="flex items-start">
								<span className="text-red-500 mr-4">[x]</span>
								METADATA_MISMATCH: DETECTED
							</li>
							<li className="flex items-start">
								<span className="text-red-500 mr-4">[x]</span>
								QUERY_FAIL: CROSS_BUCKET_SEARCH
							</li>
						</ul>
					</div>

					{/* Right: Solution */}
					<div className="p-12 lg:p-16 bg-zinc-900/10">
						<div className="flex items-center space-x-2 text-blue-500 mb-6 font-mono text-xs uppercase tracking-wider">
							<span className="w-2 h-2 bg-blue-500" />
							<span>[+] Resolution: Unified_Layer</span>
						</div>
						<h2 className="text-3xl font-bold text-white mb-8 font-mono">
							ABSTRACTION_PROTOCOL
						</h2>
						<ul className="space-y-6 font-mono text-sm text-zinc-400">
							<li className="flex items-start">
								<span className="text-blue-500 mr-4">[v]</span>
								UNIFIED_CORE_API: ACTIVE
							</li>
							<li className="flex items-start">
								<span className="text-blue-500 mr-4">[v]</span>
								SMART_ROUTING: ENABLED
							</li>
							<li className="flex items-start">
								<span className="text-blue-500 mr-4">[v]</span>
								AUDIT_LOG_STREAM: ACTIVE
							</li>
						</ul>
					</div>
				</div>
			</div>

			{/* Installation Process - Horizontal Steps */}
			<Section className="!py-32">
				<div className="text-center mb-16">
					<h2 className="text-2xl font-bold text-white mb-4 font-mono uppercase tracking-widest">
						Installation_Process
					</h2>
				</div>

				<div className="grid md:grid-cols-3 gap-8">
					{[
						{
							step: "01",
							title: "CONNECT",
							desc: "LINK_PROVIDER_CREDENTIALS(AES_256_ENCR)",
							icon: Globe,
						},
						{
							step: "02",
							title: "CONFIGURE",
							desc: "DEFINE_MOUNT_POINTS & ACCESS_POLICY",
							icon: Layout,
						},
						{
							step: "03",
							title: "EXECUTE",
							desc: "AUTO_TRANSFER_QUEUE: RUNNING",
							icon: Cloud,
						},
					].map((item, i) => (
						<div
							key={i}
							className="border border-zinc-800 p-8 hover:border-blue-500 transition-colors group relative bg-black"
						>
							<div className="flex justify-between items-start mb-8">
								<item.icon className="w-6 h-6 text-blue-500" />
								<span className="font-mono text-xs text-zinc-600 group-hover:text-blue-500 transition-colors">
									STEP_{item.step}
								</span>
							</div>
							<h3 className="text-lg font-bold text-white mb-2 font-mono">
								{item.title}.
							</h3>
							<p className="text-xs font-mono text-zinc-500 uppercase">
								{item.desc}
							</p>

							{/* Connector Line */}
							{i !== 2 && (
								<div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-zinc-800 z-10" />
							)}
						</div>
					))}
				</div>
			</Section>

			{/* Capabilities Grid - Dense */}
			<div className="border-y border-zinc-800 bg-black">
				<div className="max-w-7xl mx-auto">
					<div className="px-4 py-4 border-b border-zinc-800">
						<h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">
							SYTEM_CAPABILITIES_REPORT
						</h2>
					</div>
					<div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800 border-x border-zinc-800">
						{[
							{
								label: "SEARCH_ENG",
								title: "GLOBAL_INDEX",
								desc: "INSTANT_RETRIEVAL_ALL_NODES",
							},
							{
								label: "MONITOR_SYS",
								title: "TELEMETRY_STREAM",
								desc: "LATENCY_TRACKING_REALTIME",
							},
							{
								label: "UI_RENDER",
								title: "UNIFIED_VIEWPORT",
								desc: "SINGLE_PANE_STORAGE_MGMT",
							},
							{
								label: "SEC_PROTO",
								title: "RBAC_ENFORCEMENT",
								desc: "GRANULAR_WORKSPACE_AUTH",
							},
							{
								label: "LOG_SERV",
								title: "EVENT_RECORDER",
								desc: "COMPLETE_TRANSACTION_HISTORY",
							},
							{
								label: "VAULT_CORE",
								title: "KEY_ROTATION",
								desc: "ENCRYPTED_SECRET_CYCLES",
							},
						].map((item, i) => (
							<div
								key={i}
								className="p-8 hover:bg-zinc-900 transition-colors group"
							>
								<div className="text-[10px] font-mono text-blue-500 mb-4 uppercase tracking-wider">
									[{item.label}]
								</div>
								<h3 className="text-sm font-bold text-white mb-2 font-mono">
									{item.title}
								</h3>
								<p className="text-xs font-mono text-zinc-500 uppercase">
									{item.desc}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Architecture Spec - Wireframe Style */}
			<Section className="!py-32">
				<div className="grid lg:grid-cols-2 gap-16 items-center">
					<div>
						<h2 className="text-4xl font-bold text-white mb-8 font-mono">
							ARCH_RELIABILITY_SPEC
						</h2>
						<p className="text-sm font-mono text-zinc-400 mb-8 leading-relaxed uppercase">
							SYSTEM_LOG: DRIVEBASE_CORE ARCHITECTURE IS BUILT ON FAULT-TOLERANT
							DISTRIBUTED JOB AGENTS. ADAPTER_LAYER: PLUGGABLE. STORAGE_ENGINE:
							VIRTUALIZED.
						</p>

						<div className="space-y-px bg-zinc-800 border border-zinc-800">
							<div className="p-4 bg-black flex items-center space-x-4 hover:bg-zinc-900 transition-colors">
								<Cpu className="w-5 h-5 text-blue-500" />
								<div className="font-mono text-xs">
									<div className="text-white font-bold uppercase">
										MODULE: ADAPTER_PLUGINS
									</div>
									<div className="text-zinc-500">
										EXTEND_SUPPORT_TO_CUSTOM_BACKENDS
									</div>
								</div>
							</div>
							<div className="p-4 bg-black flex items-center space-x-4 hover:bg-zinc-900 transition-colors">
								<Database className="w-5 h-5 text-blue-500" />
								<div className="font-mono text-xs">
									<div className="text-white font-bold uppercase">
										MODULE: METADATA_DB
									</div>
									<div className="text-zinc-500">
										HIGH_SPEED_QUERY_OPTIMIZATION
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="border border-zinc-800 bg-zinc-900/20 p-4">
						<div className="aspect-square bg-black border border-zinc-800 relative overflow-hidden flex items-center justify-center">
							{/* Grid overlay */}
							<div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:20px_20px]" />

							<img
								src="https://picsum.photos/seed/schematic/800/800?grayscale"
								alt="Core Engine Schematic"
								className="w-3/4 h-3/4 object-contain opacity-50 mix-blend-screen invert"
							/>

							<div className="absolute bottom-2 right-2 text-[8px] font-mono text-zinc-700">
								DIAG_REF: C825A1C9AD034025B4001EE1B3FD7A20 //
								CORE_ENGINE_SCHEMATIC
							</div>
						</div>
					</div>
				</div>
			</Section>

			{/* User Types - Grid */}
			<div className="border-y border-zinc-800 bg-black">
				<div className="max-w-7xl mx-auto grid md:grid-cols-3 divide-x divide-zinc-800 border-x border-zinc-800">
					<div className="p-12 hover:bg-zinc-900 transition-colors">
						<div className="text-blue-500 mb-6 font-mono text-xl">&lt;&gt;</div>
						<h3 className="text-lg font-bold text-white mb-2 font-mono uppercase">
							SYS_DEV
						</h3>
						<p className="text-xs font-mono text-zinc-500 uppercase mb-6 leading-relaxed">
							CONSOLIDATE_MULTIPLE_SDK_INSTANCES_INTO_ONE_API_ENDPOINT.
						</p>
						<div className="text-[10px] font-mono text-blue-500 cursor-pointer hover:underline">
							[RUN_SDK_INIT]
						</div>
					</div>
					<div className="p-12 hover:bg-zinc-900 transition-colors">
						<Users className="w-6 h-6 text-blue-500 mb-6" />
						<h3 className="text-lg font-bold text-white mb-2 font-mono uppercase">
							COLLAB_UNITS
						</h3>
						<p className="text-xs font-mono text-zinc-500 uppercase mb-6 leading-relaxed">
							MANAGE_CROSS_PROVIDER_ASSETS_WITHOUT_CREDENTIAL_LEAKAGE.
						</p>
						<div className="text-[10px] font-mono text-blue-500 cursor-pointer hover:underline">
							[RUN_TEAM_INIT]
						</div>
					</div>
					<div className="p-12 hover:bg-zinc-900 transition-colors">
						<Server className="w-6 h-6 text-blue-500 mb-6" />
						<h3 className="text-lg font-bold text-white mb-2 font-mono uppercase">
							HOST_LOCAL
						</h3>
						<p className="text-xs font-mono text-zinc-500 uppercase mb-6 leading-relaxed">
							INTEGRATE_NAS_NODES_WITH_CLOUD_MIRROR_PROTOCOLS.
						</p>
						<div className="text-[10px] font-mono text-blue-500 cursor-pointer hover:underline">
							[RUN_SELF_HOST]
						</div>
					</div>
				</div>
			</div>

			{/* Footer CTA */}
			<div className="py-32 text-center bg-black border-b border-zinc-800">
				<div className="max-w-3xl mx-auto px-4">
					<h2 className="text-3xl md:text-5xl font-bold text-white mb-6 font-mono uppercase">
						INITIATE_STORAGE_CONTROL_TODAY
					</h2>
					<p className="text-zinc-500 mb-10 font-mono text-sm">
						NODES_CONNECTED: 10,000+ // SYSTEM_STABILITY: 99.99%
					</p>
					<div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
						<button className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-mono text-sm font-bold uppercase tracking-wider transition-colors w-full sm:w-auto">
							[EXECUTE_DEPLOYMENT]
						</button>
						<button className="px-8 py-4 bg-transparent border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white font-mono text-sm font-bold uppercase tracking-wider transition-colors w-full sm:w-auto">
							[CONTACT_CORE_SYS]
						</button>
					</div>
				</div>
			</div>

			{/* Footer */}
			<footer className="bg-black py-16">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
						<div className="col-span-2">
							<div className="flex items-center space-x-2 mb-6">
								<Layers className="w-5 h-5 text-white" />
								<span className="text-white font-bold font-mono tracking-tighter">
									DRIVEBASE_OS
								</span>
							</div>
							<p className="text-[10px] font-mono text-zinc-500 leading-relaxed max-w-[250px] uppercase">
								STORAGE_VIRTUALIZATION_PLATFORM. <br />
								BUILT_FOR_OPTIMAL_THROUGHPUT.
							</p>
						</div>
						<div>
							<h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-6 font-mono">
								[PRODUCT]
							</h4>
							<ul className="space-y-3 text-[10px] font-mono text-zinc-500 uppercase">
								<li>
									<a href="#" className="hover:text-blue-500 transition-colors">
										FEAT_01
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-blue-500 transition-colors">
										INT_NODE_LIST
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-blue-500 transition-colors">
										SUBSCRIPTION_MODEL
									</a>
								</li>
							</ul>
						</div>
						<div>
							<h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-6 font-mono">
								[RESOURCES]
							</h4>
							<ul className="space-y-3 text-[10px] font-mono text-zinc-500 uppercase">
								<li>
									<a href="#" className="hover:text-blue-500 transition-colors">
										MAN_PAGES
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-blue-500 transition-colors">
										API_REF_V2
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-blue-500 transition-colors">
										SYS_HANDBOOK
									</a>
								</li>
							</ul>
						</div>
						<div>
							<h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-6 font-mono">
								[ORG]
							</h4>
							<ul className="space-y-3 text-[10px] font-mono text-zinc-500 uppercase">
								<li>
									<a href="#" className="hover:text-blue-500 transition-colors">
										BIOS
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-blue-500 transition-colors">
										JOBS_DAEMON
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-blue-500 transition-colors">
										PRIV_POLICY
									</a>
								</li>
							</ul>
						</div>
						<div>
							<h4 className="text-[10px] font-bold text-white uppercase tracking-wider mb-6 font-mono">
								[NET_LINK]
							</h4>
							<ul className="space-y-3 text-[10px] font-mono text-zinc-500 uppercase">
								<li>
									<a href="#" className="hover:text-blue-500 transition-colors">
										TERM_X
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-blue-500 transition-colors">
										GIT_REPO
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-blue-500 transition-colors">
										DIS_COMMS
									</a>
								</li>
							</ul>
						</div>
					</div>
					<div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4">
						<div className="text-[10px] font-mono text-zinc-700 uppercase">
							© 2024 DRIVEBASE_INC. ALL_SYSTEMS_RESERVED.
						</div>
						<div className="flex space-x-6 text-[10px] font-mono text-zinc-800 uppercase">
							<span>UID: USER_8842</span>
							<span>SESSION_KEY: DB_77IX_A</span>
							<span>LOC: DC_EAST_01</span>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
