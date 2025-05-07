
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Video } from "lucide-react";
import ApiKeyConfig from "./ApiKeyConfig";

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.split("/")[1] || "image-gen";

  const handleTabChange = (value: string) => {
    navigate(`/${value}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Danilo Gato AI</h1>
            <ApiKeyConfig />
          </div>
          
          <Tabs 
            value={currentPath} 
            onValueChange={handleTabChange}
            className="mt-6"
          >
            <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
              <TabsTrigger value="image-gen" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                <span>Image Gen</span>
              </TabsTrigger>
              <TabsTrigger value="script-gen" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                <span>Script Gen</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
