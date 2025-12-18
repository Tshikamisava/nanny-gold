import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Lightbulb,
  Bot,
  TrendingUp
} from 'lucide-react';
import { FAQDialog } from './FAQDialog';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  is_active: boolean;
  auto_response_enabled: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export const FAQManagement = () => {
  const { toast } = useToast();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('faq_articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      toast({
        title: "Error",
        description: "Failed to load FAQ articles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFAQStatus = async (faqId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('faq_articles')
        .update({ is_active: !currentStatus })
        .eq('id', faqId);

      if (error) throw error;

      setFaqs(prev => prev.map(faq => 
        faq.id === faqId ? { ...faq, is_active: !currentStatus } : faq
      ));

      toast({
        title: "FAQ updated",
        description: `FAQ ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error('Error updating FAQ:', error);
      toast({
        title: "Error",
        description: "Failed to update FAQ status",
        variant: "destructive",
      });
    }
  };

  const deleteFAQ = async (faqId: string) => {
    if (!confirm('Are you sure you want to delete this FAQ? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('faq_articles')
        .delete()
        .eq('id', faqId);

      if (error) throw error;

      setFaqs(prev => prev.filter(faq => faq.id !== faqId));

      toast({
        title: "FAQ deleted",
        description: "FAQ article has been deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      toast({
        title: "Error",
        description: "Failed to delete FAQ article",
        variant: "destructive",
      });
    }
  };

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || faq.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  const stats = {
    total: faqs.length,
    active: faqs.filter(f => f.is_active).length,
    autoResponse: faqs.filter(f => f.auto_response_enabled).length,
    totalViews: faqs.reduce((sum, f) => sum + f.view_count, 0)
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total FAQs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Auto-Response</p>
                <p className="text-2xl font-bold">{stats.autoResponse}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-fuchsia-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{stats.totalViews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search FAQs by question, answer, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* FAQ List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>FAQ Articles ({filteredFAQs.length})</CardTitle>
            <FAQDialog onFAQCreated={loadFAQs} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="space-y-2 p-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading FAQs...
                </div>
              ) : filteredFAQs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No FAQ articles found</p>
                  <p className="text-xs">Create your first FAQ to help users</p>
                </div>
              ) : (
                filteredFAQs.map((faq) => (
                  <div key={faq.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {faq.category}
                          </Badge>
                          {faq.auto_response_enabled && (
                            <Badge className="bg-blue-500 text-white text-xs">
                              <Bot className="w-3 h-3 mr-1" />
                              Auto-Response
                            </Badge>
                          )}
                          <Badge 
                            variant={faq.is_active ? "default" : "secondary"} 
                            className="text-xs"
                          >
                            {faq.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {faq.view_count} views
                          </span>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{faq.question}</h4>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {faq.answer}
                        </p>
                        {faq.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {faq.keywords.map((keyword, index) => (
                              <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFAQStatus(faq.id, faq.is_active)}
                        >
                          {faq.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <FAQDialog 
                          editFAQ={faq}
                          onFAQCreated={loadFAQs}
                          trigger={
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteFAQ(faq.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};