import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { TextInput } from 'react-native-paper';
import { BarChart } from 'react-native-chart-kit';

interface FormData {
  monthlyKWh: number;
  homeSize: number;
  sunHours: number;
}

interface Results {
  annualSavings: number;
  payback: number;
  production: number;
  co2Reduction: number;
}

export default function App() {
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      monthlyKWh: 0,
      homeSize: 0,
      sunHours: 1200, // Default annual sun hours
    },
  });

  const [results, setResults] = React.useState<Results | null>(null);

  const onSubmit = (data: FormData): void => {
    // Calculation logic
    const monthlyKWh = data.monthlyKWh;
    const homeSize = data.homeSize;
    const sunHours = data.sunHours;

    const roofArea = homeSize * 0.3; // 30% usable roof area (Jackery Solar Guide)
    const panelEfficiency = 0.15; // 15% standard
    const performanceRatio = 0.75; // System losses (Jackery Solar Guide)
    const electricityRate = 0.17; // €/kWh average (Palmetto Payback Guide)
    const systemCost = 15000; // € for ~10kW system (Palmetto Payback Guide)
    const co2Factor = 0.4; // kg CO2 per kWh saved (GotRhythm Savings Calc)

    const capacityKW = roofArea * panelEfficiency; // kW estimate
    const annualProduction = capacityKW * sunHours * performanceRatio; // kWh/year (Jackery Solar Guide)
    const annualSavings = annualProduction * electricityRate; // €/year
    const paybackYears = annualSavings > 0 ? systemCost / annualSavings : 0;
    const co2Reduction = annualProduction * co2Factor; // kg/year
    
    const newResults: Results = {
      annualSavings: Math.round(annualSavings),
      payback: Math.round(paybackYears * 100) / 100,
      production: Math.round(annualProduction),
      co2Reduction: Math.round(co2Reduction),
    };

    setResults(newResults);
    if (paybackYears > 20) {
      Alert.alert('Note', 'High payback may indicate more roof space needed.');
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
    backgroundGradientFrom: 'white',
    backgroundGradientTo: 'white',
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Green for savings
    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
    decimalPlaces: 0,
    yAxisSuffix: '€', // Required fix: Adds € suffix to y-axis labels
  };

  return (
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
          />
        )}
      />
      {errors.homeSize && <Text style={styles.error}>{errors.homeSize.message}</Text>}

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
          />
        )}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)}>
        <Text style={styles.buttonText}>Calculate ROI</Text>
      </TouchableOpacity>

      {results && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>Your Solar Estimate</Text>
          <Text style={styles.resultText}>Annual Production: {results.production} kWh</Text>
          <Text style={styles.resultText}>Annual Savings: €{results.annualSavings}</Text>
          <Text style={styles.resultText}>Payback Period: {results.payback} years</Text>
          <Text style={styles.resultText}>CO₂ Reduction: {results.co2Reduction} kg/year</Text>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#10B981',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  results: {
    marginTop: 30,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  resultText: {
    fontSize: 16,
    marginVertical: 5,
  },
  chartTitle: {
    fontSize: 16,
    marginTop: 15,
    marginBottom: 5,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  error: {
    color: 'red',
    fontSize: 12,
    marginBottom: 10,
  },
});
