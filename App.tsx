import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  Switch,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { TextInput } from 'react-native-paper';
import { BarChart } from 'react-native-chart-kit';
import * as Location from 'expo-location'; // For location-based sun hours
import * as Print from 'expo-print'; // For PDF generation from HTML
import * as Sharing from 'expo-sharing'; // For sharing PDF
import { ThemeProvider, useTheme } from './ThemeContext';
import { Provider as PaperProvider } from 'react-native-paper';
import { DefaultTheme } from 'react-native-paper';

interface FormData {
  monthlyKWh: number;
  homeSize: number;
  sunHours: number;
  batteryCapacity: number; // New: kWh for battery
}

interface Results {
  annualSavings: number;
  payback: number;
  production: number;
  co2Reduction: number;
  selfConsumption: number; // New: % self-consumption rate
}

// Dynamic colors based on theme
const getThemeColors = (theme: 'light' | 'dark') => ({
  background: theme === 'dark' ? '#121212' : '#f5f5f5',
  text: theme === 'dark' ? '#ffffff' : '#000000',
  subtitle: theme === 'dark' ? '#cccccc' : '#666666',
  inputBg: theme === 'dark' ? '#1e1e1e' : 'white',
  resultsBg: theme === 'dark' ? '#1a1a1a' : 'white',
  error: theme === 'dark' ? '#ff6b6b' : 'red',
});

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const appColors = getThemeColors(theme === 'dark' ? 'dark' : 'light');//: Direct param, no ternary needed

  // New: Create Paper theme synced with app dark mode
  const paperTheme = {
    ...DefaultTheme,
    dark: theme === 'dark',
    colors: {
      ...DefaultTheme.colors,
      primary: '#10B981', // Your green
      background: appColors.background, // App bg
      surface: appColors.inputBg, // Input/ card bg (e.g., #1e1e1e dark)
      text: appColors.text, // Text color
      onSurface: appColors.text, // Input text/borders
      onSurfaceVariant: appColors.text, 
      error: appColors.error, // Error text
    },
  };

  const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    defaultValues: {
      monthlyKWh: 0,
      homeSize: 0,
      sunHours: 1200, // Default annual sun hours (Germany avg)
      batteryCapacity: 0, // Default no battery
    },
  });

  const [results, setResults] = React.useState<Results | null>(null);
  const [batteryEnabled, setBatteryEnabled] = React.useState(false); // New: Toggle state
  const batteryCapacity = watch('batteryCapacity'); // Watch for conditional display

  // Function: Get location and estimate sun hours (Germany-focused: 1000-1400h)
  const getLocationSunHours = async () => {
    try {
      // Request permission (foreground for quick access)
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          `Location access needed to estimate sun hours. ${Platform.OS === 'ios' ? 'Go to Settings > SolarROI > Location.' : 'Enable in app settings.'}`
        );
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude } = location.coords;

      // Estimate annual peak sun hours for Germany (47°-55° lat)
      // Approximation: base 1200 + (51 - lat) * 5, clamped 1000-1400
      let estimatedSunHours = 1200 + (51 - latitude) * 5;
      estimatedSunHours = Math.max(1000, Math.min(1400, estimatedSunHours));

      // Set form value
      setValue('sunHours', Math.round(estimatedSunHours));

      Alert.alert('Location Updated', `Sun hours set to ~${Math.round(estimatedSunHours)} based on latitude ${latitude.toFixed(1)}° (Germany estimate).`);
    } catch (error: any) {
      Alert.alert('Location Error', `Failed to get location: ${error.message}`);
    }
  };

  // Generate HTML for PDF from results (updated for battery; fixed boost calc)
  const generatePDFHtml = (results: Results): string => `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; background: white; color: #333; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; color: #10B981; margin-bottom: 5px; }
          .subtitle { font-size: 14px; color: #666; }
          .section { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 16px; }
          .label { font-weight: bold; width: 60%; }
          .value { width: 40%; text-align: right; color: #10B981; }
          .footer { position: absolute; bottom: 30px; left: 40px; right: 40px; text-align: center; font-size: 10px; color: #999; font-style: italic; }
          .battery { background: #e6f4ff; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">SolarROI Estimator Report</div>
          <div class="subtitle">Your Personalized Solar Savings Estimate (Germany)</div>
        </div>
        <div class="section">
          <span class="label">Annual Production:</span>
          <span class="value">${results.production} kWh</span>
        </div>
        <div class="section">
          <span class="label">Annual Savings:</span>
          <span class="value">€${results.annualSavings}</span>
        </div>
        <div class="section">
          <span class="label">Payback Period:</span>
          <span class="value">${results.payback} years</span>
        </div>
        <div class="section">
          <span class="label">CO₂ Reduction:</span>
          <span class="value">${results.co2Reduction} kg/year</span>
        </div>
        ${batteryEnabled ? `
        <div class="battery">
          <strong>Battery Storage (${Math.round(batteryCapacity)} kWh):</strong><br>
          Self-Consumption: ${Math.round(results.selfConsumption * 100)}%<br>
          Boosted Savings: +${Math.round(results.annualSavings * ((results.selfConsumption - 0.5) / results.selfConsumption))}€/year (est.)
        </div>
        ` : ''}
        <div class="footer">Generated by SolarROI Estimator App | Germany Rates & KfW Subsidies 2025</div>
      </body>
    </html>
  `;

  // Generate and Share PDF Function (using expo-print)
  const generateAndSharePDF = async (results: Results) => {
    try {
      const html = generatePDFHtml(results);
      const { uri } = await Print.printToFileAsync({ html });

      // Share the PDF URI
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Solar Report' });
      } else {
        Alert.alert('Sharing Not Available', `PDF saved at: ${uri}`);
      }
    } catch (error: any) {
      Alert.alert('PDF Error', `Failed to generate PDF: ${error.message}`);
    }
  };

  const onSubmit = (data: FormData): void => {
    // Calculation logic (Germany-focused)
    const monthlyKWh = data.monthlyKWh;
    const homeSize = data.homeSize;
    const sunHours = data.sunHours;
    const batteryCap = batteryEnabled ? data.batteryCapacity : 0; // Use submitted data

    const roofArea = homeSize * 0.3; // 30% usable roof area (Jackery Solar Guide)
    const panelEfficiency = 0.15; // 15% standard
    const performanceRatio = 0.75; // System losses (Jackery Solar Guide)
    const electricityRate = 0.37; // €/kWh Germany avg 2025 (BDEW)
    const systemCost = 15000 * 0.7; // € for ~10kW post-30% KfW subsidy
    const batteryCostPerKWh = 800; // €/kWh post-30% subsidy (LiFePO4 est.)
    const co2Factor = 0.4; // kg CO2 per kWh saved (GotRhythm Savings Calc)

    // Battery boost: Self-consumption rate (50% base, +20-40% with 5-10kWh)
    const baseSelfConsumption = 0.5;
    let selfConsumption = baseSelfConsumption;
    if (batteryEnabled && batteryCap > 0) {
      selfConsumption = Math.min(0.9, baseSelfConsumption + (batteryCap / 20) * 0.4); // Boost formula
    }

    const capacityKW = roofArea * panelEfficiency; // kW estimate
    const annualProduction = capacityKW * sunHours * performanceRatio; // kWh/year (Jackery Solar Guide)
    const annualSavings = annualProduction * electricityRate * selfConsumption; // €/year with self-consumption
    const totalCost = systemCost + (batteryEnabled ? batteryCap * batteryCostPerKWh : 0);
    const paybackYears = annualSavings > 0 ? totalCost / annualSavings : 0;
    const co2Reduction = annualProduction * co2Factor; // kg/year

    const newResults: Results = {
      annualSavings: Math.round(annualSavings),
      payback: Math.round(paybackYears * 100) / 100,
      production: Math.round(annualProduction),
      co2Reduction: Math.round(co2Reduction),
      selfConsumption,
    };

    setResults(newResults);
    if (paybackYears > 12) {
      Alert.alert('Note', 'High payback may indicate more roof space or battery optimization needed.');
    }
  };

  // ROI data for chart: years vs cumulative savings
  const chartData = results
    ? Array.from({ length: Math.min(10, Math.ceil(results.payback) + 1) }, (_, i) => ({
        x: i + 1,
        y: (i + 1) * results.annualSavings,
      }))
    : [];

  const chartConfig = {
    backgroundGradientFrom: appColors.background, //: appColors
    backgroundGradientTo: appColors.background,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Green for savings
    labelColor: (opacity = 1) => `rgba(${theme === 'dark' ? '200,200,200' : '102,102,102'}, ${opacity})`,
    decimalPlaces: 0,
    yAxisSuffix: '€', // Required in config for fallback
  };

  // Dynamic styles with theme (fixed: appColors; removed input bg)
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 15,
      backgroundColor: appColors.background, //: appColors
      marginTop: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      marginVertical: 30,
      marginBottom: 20,
      color: appColors.text, //
    },
    subtitle: {
      textAlign: 'center',
      marginBottom: 10,
      color: appColors.subtitle, //
    },
    input: {
      marginVertical: 10,
      // Removed backgroundColor: Let Paper theme handle input colors
    },
    locationButton: {
      backgroundColor: '#3B82F6', // Blue unchanged, or theme it
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginVertical: 10,
      marginHorizontal: 15,
    },
    locationButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    toggleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 10,
      padding: 10,
      backgroundColor: appColors.inputBg, //
      borderRadius: 8,
    },
    toggleLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      flex: 1,
      color: appColors.text, //
    },
    button: {
      backgroundColor: '#10B981',
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginVertical: 10,
      marginHorizontal: 15,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    results: {
      marginTop: 10,
      padding: 20,
      backgroundColor: appColors.resultsBg, 
      borderRadius: 8,
    },
    resultsTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 15,
      color: appColors.text, 
    },
    resultText: {
      fontSize: 16,
      marginVertical: 5,
      color: appColors.text, 
    },
    exportButton: {
      backgroundColor: '#8B5CF6',
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginVertical: 15,
    },
    exportButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    chartTitle: {
      fontSize: 16,
      marginTop: 15,
      marginBottom: 5,
      textAlign: 'center',
      color: appColors.text, 
    },
    chart: {
      marginVertical: 8,
      borderRadius: 16,
    },
    error: {
      color: appColors.error, 
      fontSize: 12,
      marginBottom: 10,
    },
    themeToggle: { 
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 10,
      padding: 10,
      backgroundColor: appColors.inputBg, 
      borderRadius: 8,
    },
    themeLabel: {
      fontSize: 16,
      color: appColors.text, 
    },
  });

  return (
    <PaperProvider theme={paperTheme}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>SolarROI Estimator</Text>
        <Text style={styles.subtitle}>Enter your home details for solar savings estimate</Text>

        <Controller
          control={control}
          name="monthlyKWh"
          rules={{ required: 'Monthly kWh required', min: 0, max: 2000 }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Monthly Electricity (kWh)"
              value={value?.toString()}
              onChangeText={(text) => onChange(parseFloat(text) || 0)}
              keyboardType="numeric"
              error={!!errors.monthlyKWh}
              style={styles.input}
              mode="outlined"
              theme={paperTheme} // Consistent theming
            />
          )}
        />
        {errors.monthlyKWh && <Text style={styles.error}>{errors.monthlyKWh.message}</Text>}

        <Controller
          control={control}
          name="homeSize"
          rules={{ required: 'Home size required', min: 50, max: 500 }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Home Size (m²)"
              value={value?.toString()}
              onChangeText={(text) => onChange(parseFloat(text) || 0)}
              keyboardType="numeric"
              error={!!errors.homeSize}
              style={styles.input}
              mode="outlined"
              theme={paperTheme} // Added for consistent dark mode
            />
          )}
        />
        {errors.homeSize && <Text style={styles.error}>{errors.homeSize.message}</Text>}

        {/* Location Button for Sun Hours */}
        <TouchableOpacity style={styles.locationButton} onPress={getLocationSunHours}>
          <Text style={styles.locationButtonText}>Use My Location for Sun Hours</Text>
        </TouchableOpacity>

        <Controller
          control={control}
          name="sunHours"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Annual Sun Hours (default 1200)"
              value={value?.toString()}
              onChangeText={(text) => onChange(parseFloat(text) || 1200)}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
              theme={paperTheme} // Added for consistent dark mode
            />
          )}
        />

        {/* New: Battery Toggle and Input */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Add Battery Storage (Hybrid Setup)</Text>
          <Switch
            value={batteryEnabled}
            onValueChange={setBatteryEnabled}
            trackColor={{ true: '#10B981' }}
            thumbColor={batteryEnabled ? 'white' : '#f4f3f4'}
          />
        </View>
        {batteryEnabled && (
          <Controller
            control={control}
            name="batteryCapacity"
            rules={{ required: 'Battery capacity required', min: 1, max: 20 }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Battery Capacity (kWh, e.g., 5-10)"
                value={value?.toString()}
                onChangeText={(text) => onChange(parseFloat(text) || 0)}
                keyboardType="numeric"
                error={!!errors.batteryCapacity}
                style={styles.input}
                mode="outlined"
                theme={paperTheme} // Added for consistent dark mode
              />
            )}
          />
        )}
        {batteryEnabled && errors.batteryCapacity && <Text style={styles.error}>{errors.batteryCapacity.message}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)}>
          <Text style={styles.buttonText}>Calculate ROI</Text>
        </TouchableOpacity>

        {results && (
          <View style={styles.results}>
            <Text style={styles.resultsTitle}>Your Solar Estimate</Text>
            <Text style={styles.resultText}>Annual Production: {results.production} kWh</Text>
            <Text style={styles.resultText}>Self-Consumption: {Math.round(results.selfConsumption * 100)}%</Text>
            <Text style={styles.resultText}>Annual Savings: €{results.annualSavings}</Text>
            {batteryEnabled && (
              <Text style={styles.resultText}>
                Battery Boost: +{Math.round(results.annualSavings * ((results.selfConsumption - 0.5) / results.selfConsumption))}€/year (est.)
              </Text>
            )}
            <Text style={styles.resultText}>Payback Period: {results.payback} years</Text>
            <Text style={styles.resultText}>CO₂ Reduction: {results.co2Reduction} kg/year</Text>

            {/* Export PDF Button */}
            <TouchableOpacity style={styles.exportButton} onPress={() => generateAndSharePDF(results)}>
              <Text style={styles.exportButtonText}>Export PDF Report</Text>
            </TouchableOpacity>

            <Text style={styles.chartTitle}>Cumulative ROI Over Years (First 10)</Text>
            <BarChart
              data={{
                labels: chartData.map((d) => `Yr ${d.x}`),
                datasets: [{
                  data: chartData.map((d) => d.y),
                  colors: [() => '#10B981'], // Solid green bars
                }],
              }}
              width={Dimensions.get('window').width - 70}
              height={220}
              yAxisLabel=""
              yAxisSuffix="€"
              fromZero={true}
              chartConfig={chartConfig}
              horizontalLabelRotation={-30} // Rotate labels to fit
              style={styles.chart}
            />

            
          </View>
        )}

         {/* Theme Toggle Switch - Moved inside results for UX */}
            <View style={styles.themeToggle}>
              <Text style={styles.themeLabel}>Dark Mode: {theme === 'dark' ? 'On' : 'Off'}</Text>
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ true: '#10B981', false: '#767577' }}
                thumbColor={theme === 'dark' ? '#f4f3f4' : '#f4f3f4'}
              />
            </View>


      </ScrollView>
    </PaperProvider>
  );
}


