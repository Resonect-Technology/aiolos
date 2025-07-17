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

                                            <div className="mt-6 text-center">
                                                <p className="text-sm text-foreground/70">
                                                    Interested in supporting Aiolos? <Button variant="link" className="p-0 h-auto text-sm text-primary">Contact us</Button> to learn about sponsorship opportunities.
                                                </p>
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
