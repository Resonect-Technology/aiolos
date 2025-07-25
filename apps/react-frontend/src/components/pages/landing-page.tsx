import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/organisms/navigation/app-sidebar";
import { SiteHeader } from "@/components/organisms/navigation/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
    Wind,
    ArrowRight
} from "lucide-react";

export function LandingPage() {
    const navigate = useNavigate();

    const handleViewDashboard = () => {
        navigate('/dashboard');
    };

    return (
        <SidebarProvider
            defaultOpen={false}
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                            <div className="px-4 lg:px-6">
                                <div className="max-w-4xl mx-auto">
                                    {/* Header */}
                                    <div className="text-center mb-12">
                                        <div className="flex flex-col items-center gap-3 mb-4 md:flex-row md:justify-center">
                                            <Wind className="h-12 w-12 text-primary" />
                                            <h1 className="text-4xl font-bold text-foreground">
                                                Aiolos Wind Station
                                            </h1>
                                        </div>
                                        <p className="text-xl text-muted-foreground mb-2">
                                            Live Wind Monitoring System
                                        </p>
                                        <p className="text-lg text-muted-foreground">
                                            Real-time wind, temperature, and atmospheric data from Vasiliki
                                        </p>
                                    </div>

                                    {/* About Aiolos */}
                                    <Card className="mb-8">
                                        <CardHeader>
                                            <CardTitle className="text-center text-2xl">About Aiolos</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                                                <div className="lg:col-span-2">
                                                    <div className="prose prose-gray dark:prose-invert max-w-none">
                                                        <p className="text-lg leading-relaxed mb-4 text-foreground">
                                                            Aiolos is an IoT weather monitoring system that provides live wind data streaming from Vasiliki, Greece. The system helps windsurfers and water sports enthusiasts make informed decisions about when to head out on the water by delivering real-time wind speed, direction, and weather conditions.
                                                        </p>
                                                        <p className="text-base leading-relaxed text-foreground/80">
                                                            Beyond live data, the station collects long-term wind statistics that enable seasonal pattern analysis and year-over-year comparisons. This historical data helps understand wind trends, identify the best seasons for different wind conditions, and track how weather patterns change over time in this popular windsurfing destination.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex justify-center lg:justify-end">
                                                    <div className="w-full max-w-48">
                                                        <img
                                                            src="/station.webp"
                                                            alt="Aiolos Weather Station"
                                                            className="w-full h-auto object-cover rounded-lg shadow-md"
                                                        />
                                                        <p className="text-sm text-foreground/70 text-center mt-2">
                                                            Aiolos Weather Station in Vasiliki
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Team Section */}
                                    <Card className="mb-8">
                                        <CardHeader>
                                            <CardTitle className="text-center text-2xl">Meet the Team</CardTitle>
                                            <p className="text-center text-foreground/70 mt-2">
                                                The dedicated professionals behind Aiolos Weather Station
                                            </p>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                                                {/* Team Member 1 */}
                                                <Card className="hover:shadow-lg transition-shadow">
                                                    <CardHeader className="text-center">
                                                        <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden">
                                                            <img
                                                                src="/kuba.webp"
                                                                alt="Kuba David"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <CardTitle className="text-lg">Kuba David</CardTitle>
                                                        <p className="text-sm text-primary font-medium">Lead Developer & Architect</p>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm text-foreground/70 text-center">
                                                            10+ years windsurfing experience. Full-stack developer specializing in IoT systems. Designed the hardware architecture and firmware for the weather station platform.
                                                        </p>
                                                    </CardContent>
                                                </Card>

                                                {/* Team Member 2 */}
                                                <Card className="hover:shadow-lg transition-shadow">
                                                    <CardHeader className="text-center">
                                                        <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden">
                                                            <img
                                                                src="/jiri.webp"
                                                                alt="Jiří David"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <CardTitle className="text-lg">Jiří David</CardTitle>
                                                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">Mechanical Engineer</p>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm text-foreground/70 text-center">
                                                            30+ years of windsurfing experience. Mechanical engineer specializing in mounting systems and structural design. Responsible for the robust mechanical setup.
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Sponsors Section */}
                                    <Card className="mb-8">
                                        <CardHeader>
                                            <CardTitle className="text-center text-2xl">Our Sponsors</CardTitle>
                                            <p className="text-center text-foreground/70 mt-2">
                                                Supporting innovation in environmental monitoring
                                            </p>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-center">
                                                {/* Sponsor 1 - Resonect Technology */}
                                                <a
                                                    href="https://resonect.cz"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center h-28 w-56 rounded-lg grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100"
                                                >
                                                    <img
                                                        src="/Resonect_Logo_Full.svg"
                                                        alt="Resonect Technology"
                                                        className="h-20 w-auto object-contain"
                                                    />
                                                </a>
                                            </div>
                                            <div className="flex items-center justify-center">
                                                <a
                                                    href="https://www.protography.shop"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center h-28 w-140 rounded-lg grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100"
                                                >
                                                    <img
                                                        src="/protography.webp"
                                                        alt="Protography"
                                                        className="h-20 w-auto object-contain"
                                                    />
                                                </a>
                                            </div>

                                            <div className="mt-6 text-center">
                                                <p className="text-sm text-foreground/70">
                                                    Interested in supporting Aiolos? <Button variant="link" className="p-0 h-auto text-sm text-primary">Contact us</Button> to learn about sponsorship opportunities.
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Community & Support Section */}
                                    <Card className="mb-8">
                                        <CardHeader>
                                            <CardTitle className="text-center text-2xl">Community & Support</CardTitle>
                                            <p className="text-center text-foreground/70 mt-2">
                                                Join our community, share ideas, and get support
                                            </p>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                                                {/* GitHub Discussions */}
                                                <Card className="hover:shadow-lg transition-shadow">
                                                    <CardHeader className="text-center">
                                                        <div className="w-16 h-16 rounded-full mx-auto mb-4 bg-gray-900 dark:bg-gray-100 flex items-center justify-center">
                                                            <svg className="w-8 h-8 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                                            </svg>
                                                        </div>
                                                        <CardTitle className="text-lg">GitHub Discussions</CardTitle>
                                                        <p className="text-sm text-primary font-medium">Join the Conversation</p>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm text-foreground/70 text-center mb-4">
                                                            Share ideas, ask questions, report issues, or discuss new features with the Aiolos community and development team.
                                                        </p>
                                                        <div className="text-center">
                                                            <a
                                                                href="https://github.com/Resonect-Technology/aiolos/discussions"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                                                </svg>
                                                                Visit Discussions
                                                            </a>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Email Contact */}
                                                <Card className="hover:shadow-lg transition-shadow">
                                                    <CardHeader className="text-center">
                                                        <div className="w-16 h-16 rounded-full mx-auto mb-4 bg-primary flex items-center justify-center">
                                                            <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                        <CardTitle className="text-lg">Direct Contact</CardTitle>
                                                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">Email Support</p>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm text-foreground/70 text-center mb-4">
                                                            Have specific questions, partnership inquiries, or need technical support? Reach out to us directly.
                                                        </p>
                                                        <div className="text-center">
                                                            <a
                                                                href="mailto:info@resonect.cz?subject=Aiolos%20Weather%20Station%20Inquiry"
                                                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 border border-green-600 dark:border-green-400 rounded-lg hover:bg-green-600 dark:hover:bg-green-400 hover:text-white dark:hover:text-gray-900 transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                </svg>
                                                                info@resonect.cz
                                                            </a>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Call to Action */}
                                    <div className="text-center">
                                        <p className="text-lg text-foreground/80">
                                            Experience real-time environmental monitoring with Aiolos
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="mt-12 text-center text-foreground/60 text-sm p-4">
                        <p>Resonect Technology s.r.o. &copy; {new Date().getFullYear()}</p>
                        <p className="mt-1">Advanced IoT Solutions for Environmental Monitoring</p>
                    </footer>
                </div>

                {/* Fixed Dashboard Button */}
                <Button
                    onClick={handleViewDashboard}
                    size="lg"
                    className="fixed bottom-6 right-6 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 z-50"
                >
                    <ArrowRight className="mr-2 h-6 w-6" />
                    Live Dashboard
                </Button>
            </SidebarInset>
        </SidebarProvider>
    );
}
