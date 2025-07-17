import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
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
                                        <div className="flex items-center justify-center gap-3 mb-4">
                                            <Wind className="h-12 w-12 text-primary" />
                                            <h1 className="text-4xl font-bold text-foreground">
                                                Aiolos Weather Station
                                            </h1>
                                        </div>
                                        <p className="text-xl text-muted-foreground mb-2">
                                            Advanced Environmental Monitoring System
                                        </p>
                                        <p className="text-lg text-muted-foreground">
                                            Real-time wind, temperature, and atmospheric data from remote locations
                                        </p>
                                    </div>

                                    {/* About Aiolos */}
                                    <Card className="mb-8">
                                        <CardHeader>
                                            <CardTitle className="text-center text-2xl">About Aiolos</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="prose prose-gray dark:prose-invert max-w-none">
                                                <p className="text-lg leading-relaxed mb-4 text-foreground">
                                                    Aiolos is an advanced IoT weather monitoring system designed for reliable, long-term environmental data collection in remote locations. Named after the Greek god of wind, Aiolos represents the perfect fusion of cutting-edge technology and environmental science.
                                                </p>
                                                <p className="text-base leading-relaxed mb-4 text-muted-foreground">
                                                    The system features a solar-powered weather station built around the ESP32 microcontroller and SIM7000G cellular modem, enabling continuous operation in challenging environments. With professional-grade sensors and intelligent power management, Aiolos delivers accurate wind speed, wind direction, and temperature measurements 24/7.
                                                </p>
                                                <p className="text-base leading-relaxed text-muted-foreground">
                                                    Our web-based dashboard provides real-time data visualization, historical analysis, and mobile-responsive access to environmental data. Whether you're monitoring wind patterns for renewable energy projects, conducting environmental research, or tracking weather conditions for operational planning, Aiolos provides the reliability and insights you need.
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Team Section */}
                                    <Card className="mb-8">
                                        <CardHeader>
                                            <CardTitle className="text-center text-2xl">Meet the Team</CardTitle>
                                            <p className="text-center text-muted-foreground mt-2">
                                                The dedicated professionals behind Aiolos Weather Station
                                            </p>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {/* Team Member 1 */}
                                                <Card className="hover:shadow-lg transition-shadow">
                                                    <CardHeader className="text-center">
                                                        <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full mx-auto mb-4 flex items-center justify-center">
                                                            <span className="text-primary-foreground font-bold text-xl">MS</span>
                                                        </div>
                                                        <CardTitle className="text-lg">Martin Skalický</CardTitle>
                                                        <p className="text-sm text-primary font-medium">Lead Developer & Architect</p>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm text-muted-foreground text-center">
                                                            Full-stack developer specializing in IoT systems and embedded programming. Designed the hardware architecture and firmware for the weather station platform.
                                                        </p>
                                                    </CardContent>
                                                </Card>

                                                {/* Team Member 2 */}
                                                <Card className="hover:shadow-lg transition-shadow">
                                                    <CardHeader className="text-center">
                                                        <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                                                            <span className="text-white font-bold text-xl">PH</span>
                                                        </div>
                                                        <CardTitle className="text-lg">Petr Hájek</CardTitle>
                                                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">Hardware Engineer</p>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm text-muted-foreground text-center">
                                                            Electronics engineer focused on sensor integration and power management systems. Responsible for the robust hardware design and environmental testing.
                                                        </p>
                                                    </CardContent>
                                                </Card>

                                                {/* Team Member 3 */}
                                                <Card className="hover:shadow-lg transition-shadow">
                                                    <CardHeader className="text-center">
                                                        <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                                                            <span className="text-white font-bold text-xl">AV</span>
                                                        </div>
                                                        <CardTitle className="text-lg">Anna Vorlová</CardTitle>
                                                        <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Frontend Developer</p>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm text-muted-foreground text-center">
                                                            UI/UX specialist and React developer. Created the intuitive dashboard interface and real-time data visualization components for optimal user experience.
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* System Features */}
                                    <Card className="mb-8">
                                        <CardHeader>
                                            <CardTitle className="text-center">System Features</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <h3 className="font-semibold mb-3 text-foreground">Hardware</h3>
                                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                                        <li>• ESP32 + SIM7000G cellular modem</li>
                                                        <li>• Solar power with battery backup</li>
                                                        <li>• Weather-resistant enclosure</li>
                                                        <li>• Professional-grade sensors</li>
                                                    </ul>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold mb-3 text-foreground">Software</h3>
                                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                                        <li>• Real-time data transmission</li>
                                                        <li>• Power-efficient operation</li>
                                                        <li>• Remote configuration</li>
                                                        <li>• Automatic firmware updates</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Call to Action */}
                                    <div className="text-center">
                                        <Button
                                            onClick={handleViewDashboard}
                                            size="lg"
                                            className="px-8 py-3 text-lg font-semibold"
                                        >
                                            View Live Dashboard
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                        <p className="text-sm text-muted-foreground mt-3">
                                            Access real-time weather data and interactive charts
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="mt-12 text-center text-muted-foreground text-sm p-4">
                        <p>Resonect Technology s.r.o. &copy; {new Date().getFullYear()}</p>
                        <p className="mt-1">Advanced IoT Solutions for Environmental Monitoring</p>
                    </footer>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
