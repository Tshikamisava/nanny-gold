import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

interface PlacementFeeValidation {
  booking_id: string;
  home_size: string;
  base_rate: number;
  fixed_fee: number;
  expected_fee: number;
  is_correct: boolean;
  variance: number;
}

const PlacementFeeValidator = () => {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<PlacementFeeValidation[]>([]);
  const [summary, setSummary] = useState({ correct: 0, incorrect: 0, accuracy: 0 });

  const runValidation = async () => {
    setIsValidating(true);
    
    try {
      // Fetch all long-term bookings with financials
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, home_size, base_rate, booking_financials(fixed_fee)')
        .eq('booking_type', 'long_term')
        .in('status', ['confirmed', 'active']);

      if (error) throw error;

      if (!bookings || bookings.length === 0) {
        toast({
          title: "No bookings found",
          description: "No long-term bookings available to validate",
          variant: "destructive"
        });
        setIsValidating(false);
        return;
      }

      // Validate each booking
      const results: PlacementFeeValidation[] = bookings.map(booking => {
        const homeSize = booking.home_size || '';
        const actualFee = booking.booking_financials?.[0]?.fixed_fee || 0;
        const baseRate = booking.base_rate || 0;

        // Calculate expected placement fee
        let expectedFee = 0;
        if (['pocket_palace', 'family_hub', 'grand_estate'].includes(homeSize)) {
          expectedFee = 2500;
        } else if (['epic_estates', 'monumental_manor'].includes(homeSize)) {
          expectedFee = Math.round(baseRate * 0.5 * 100) / 100;
        }

        const variance = actualFee - expectedFee;
        const isCorrect = Math.abs(variance) < 0.01;

        return {
          booking_id: booking.id,
          home_size: homeSize,
          base_rate: baseRate,
          fixed_fee: actualFee,
          expected_fee: expectedFee,
          is_correct: isCorrect,
          variance
        };
      });

      // Calculate summary
      const correctCount = results.filter(r => r.is_correct).length;
      const incorrectCount = results.filter(r => !r.is_correct).length;
      const accuracy = Math.round((correctCount / results.length) * 100);

      setValidationResults(results);
      setSummary({ correct: correctCount, incorrect: incorrectCount, accuracy });

      toast({
        title: "Validation Complete",
        description: `${correctCount} correct, ${incorrectCount} incorrect (${accuracy}% accuracy)`,
        variant: accuracy === 100 ? "default" : "destructive"
      });

    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Validation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getHomeSizeDisplay = (homeSize: string) => {
    const map: Record<string, string> = {
      pocket_palace: 'Pocket Palace',
      family_hub: 'Family Hub',
      grand_estate: 'Grand Estate',
      epic_estates: 'Epic Estates',
      monumental_manor: 'Monumental Manor'
    };
    return map[homeSize] || homeSize;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Placement Fee Validator</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Validates that all placement fees match the correct structure:<br/>
                • R2,500 flat: Pocket Palace, Family Hub, Grand Estate<br/>
                • 50% of base rate: Epic Estates, Monumental Manor
              </p>
            </div>
            <Button onClick={runValidation} disabled={isValidating}>
              {isValidating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Run Validation
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {validationResults.length > 0 && (
          <CardContent className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">{summary.correct}</div>
                  <p className="text-sm text-muted-foreground">Correct</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">{summary.incorrect}</div>
                  <p className="text-sm text-muted-foreground">Incorrect</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{summary.accuracy}%</div>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                </CardContent>
              </Card>
            </div>

            {/* Critical Alert for Failures */}
            {summary.incorrect > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Action Required:</strong> {summary.incorrect} booking(s) have incorrect placement fees.
                  These need to be corrected in the database before going live.
                </AlertDescription>
              </Alert>
            )}

            {/* Results Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Home Size</TableHead>
                    <TableHead>Base Rate</TableHead>
                    <TableHead>Actual Fee</TableHead>
                    <TableHead>Expected Fee</TableHead>
                    <TableHead>Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResults.map((result) => (
                    <TableRow key={result.booking_id}>
                      <TableCell>
                        {result.is_correct ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Correct
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Incorrect
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getHomeSizeDisplay(result.home_size)}</TableCell>
                      <TableCell>R{result.base_rate.toFixed(2)}</TableCell>
                      <TableCell className={!result.is_correct ? 'text-red-600 font-semibold' : ''}>
                        R{result.fixed_fee.toFixed(2)}
                      </TableCell>
                      <TableCell>R{result.expected_fee.toFixed(2)}</TableCell>
                      <TableCell className={!result.is_correct ? 'text-red-600' : ''}>
                        {result.variance >= 0 ? '+' : ''}R{result.variance.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* SQL Query for Manual Verification */}
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">SQL Query for Manual Verification:</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`SELECT 
  b.id,
  b.home_size,
  b.base_rate,
  bf.fixed_fee as actual_fee,
  CASE 
    WHEN b.home_size IN ('pocket_palace', 'family_hub', 'grand_estate') THEN 2500
    WHEN b.home_size IN ('epic_estates', 'monumental_manor') THEN ROUND(b.base_rate * 0.5, 2)
    ELSE 0
  END as expected_fee,
  CASE 
    WHEN b.home_size IN ('pocket_palace', 'family_hub', 'grand_estate') 
      AND bf.fixed_fee = 2500 THEN 'CORRECT'
    WHEN b.home_size IN ('epic_estates', 'monumental_manor') 
      AND bf.fixed_fee = ROUND(b.base_rate * 0.5, 2) THEN 'CORRECT'
    ELSE 'INCORRECT'
  END as status
FROM bookings b
LEFT JOIN booking_financials bf ON b.id = bf.booking_id
WHERE b.booking_type = 'long_term'
  AND b.status IN ('confirmed', 'active');`}
                  </pre>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default PlacementFeeValidator;
