# Renewable Energy Tech: SolarROI Estimator

A React Native mobile app for estimating solar panel return on investment (ROI) based on home details like electricity usage and size. Built with Expo for quick deployment, it calculates production, savings, payback, and CO₂ reductions using standard PV formulas.[11][12]

## Features
- Input form for monthly kWh, home size (m²), and sun hours with validation (max 2000 kWh for residential focus).
- Real-time calculations: Annual production via $$ E = A \times r \times H \times PR $$ (A=roof area, r=0.15 efficiency, H=sun hours, PR=0.75), savings at 0.17€/kWh, and payback for €15,000 system.
- Results display with BarChart (react-native-chart-kit) for cumulative ROI over 10 years.
- Alerts for high payback (>20 years) and green theming for eco appeal.
- Location-based sun hours via Expo Location API for auto-fills.
- Export results as shareable report with react-native-pdf.
- Add battery storage estimator for hybrid solar setups.
- Dark mode and multi-language support.

## Installation
1. Clone or create: `npx create-expo-app SolarROI-Estimator`.
2. Install deps: `npm install react-hook-form react-native-paper react-native-chart-kit react-native-svg`.
3. Paste provided App.tsx content.
4. Run: `npx expo start --clear` then 'i' for iOS simulator.

## Usage
- Enter details (e.g., 400 kWh/month, 150 m² home).
- Tap "Calculate ROI" for estimates and chart.
- Test on Expo Go by scanning QR code.

## Upcoming Features
- Integration with API for real-time pricing/incentives.
- Dark mode and multi-language support.

[1](https://greenpowerenergy.com/solar-panel-roi/)
[2](https://www.pvfarm.io/blog/calculating-solar-panel-roi-a-step-by-step-look-at-financial-benefits)
[3](https://www.quickenloans.com/learn/solar-panel-roi)
[4](https://www.ecoflow.com/us/blog/how-to-calculate-solar-power-roi)
[5](https://a1solarstore.com/blog/roi-on-solar-panels-calculate-your-solar-investment-returns.html)
[6](https://www.solarreviews.com/blog/how-to-calculate-your-solar-payback-period)
[7](https://www.consumeraffairs.com/solar-energy/what-is-solar-panel-roi.html)
[8](https://www.pretapower.com/solar-power-return-on-investment-what-is-the-roi-on-solar-panels-in-2025/)
[9](https://poweroutage.us/solar/are-solar-panels-worth-it/roi)
[10](https://www.energea.com/glossary/return-on-investment-roi/)
[11](https://www.jackery.com/blogs/knowledge/ultimate-guide-to-solar-panel-calculation)
[12](https://palmetto.com/solar/solar-panel-payback-period-guide)
