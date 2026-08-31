export const positionColors = {
  QB: "#9B8AFB",
  RB: "#36CFA0",
  WR: "#5F9BFF",
  TE: "#F6B84B",
  K: "#F6B84B",
  DST: "#F38A9B",
};

export const rosterPlayers = [
  { id: "prescott", name: "Dak Prescott", team: "DAL", position: "QB", opponent: "@ NYG", projection: 17.13, score: 70.4, confidence: 72, usage: "35 pass attempts projected", weather: "Clear", matchup: "NYG allowed 245 passing yards/game", selected: true },
  { id: "etienne", name: "Travis Etienne Jr.", team: "NO", position: "RB", opponent: "@ DET", projection: 14.99, score: 72.1, confidence: 74, usage: "17 touches projected", weather: "Dome", matchup: "DET allowed 4.4 YPC last season", selected: true },
  { id: "judkins", name: "Quinshon Judkins", team: "CLE", position: "RB", opponent: "@ JAX", projection: 13.15, score: 66.3, confidence: 68, usage: "14 touches projected", weather: "Clear", matchup: "JAX allowed 4.5 YPC last season", selected: true },
  { id: "nacua", name: "Puka Nacua", team: "LAR", position: "WR", opponent: "vs SF", projection: 21.2, score: 89.8, confidence: 91, usage: "30% target share", weather: "Clear", matchup: "Elite target volume drives floor", selected: true },
  { id: "jameson-williams", name: "Jameson Williams", team: "DET", position: "WR", opponent: "vs NO", projection: 12.14, score: 61.2, confidence: 63, usage: "6 targets projected", weather: "Dome", matchup: "Big-play upside indoors", selected: true },
  { id: "mcbride", name: "Trey McBride", team: "ARI", position: "TE", opponent: "@ LAC", projection: 14.34, score: 78.6, confidence: 81, usage: "8 targets projected", weather: "Clear", matchup: "Strong middle-of-field matchup", selected: true },
  { id: "bowers", name: "Brock Bowers", team: "LV", position: "TE", opponent: "vs MIA", projection: 15.59, score: 81.3, confidence: 84, usage: "8 targets projected", weather: "Clear", matchup: "TE matchup favors volume", selected: true },
  { id: "seahawks", name: "Seahawks D/ST", team: "SEA", position: "DST", opponent: "vs NE", projection: 7.08, score: 64.1, confidence: 66, usage: "Home defensive matchup", weather: "Clear", matchup: "New England projected for a low total", selected: true },
  { id: "butker", name: "Harrison Butker", team: "KC", position: "K", opponent: "vs DEN", projection: 8.51, score: 70.2, confidence: 73, usage: "2.0 field goals projected", weather: "Clear", matchup: "High implied scoring environment", selected: true },
  { id: "brooks", name: "Jonathon Brooks", team: "CAR", position: "RB", opponent: "vs CHI", projection: 10.47, score: 52.4, confidence: 55, usage: "Limited early workload", weather: "Clear", matchup: "Committee backfield", selected: false },
  { id: "burden", name: "Luther Burden III", team: "CHI", position: "WR", opponent: "@ CAR", projection: 12.13, score: 60.6, confidence: 62, usage: "5 targets projected", weather: "Clear", matchup: "Rookie usage is volatile", selected: false },
  { id: "daniel-jones", name: "Daniel Jones", team: "IND", position: "QB", opponent: "@ BAL", projection: 15.17, score: 62.3, confidence: 64, usage: "Rushing provides upside", weather: "Clear", matchup: "BAL presents a difficult pass defense", selected: false },
  { id: "likely", name: "Isaiah Likely", team: "BAL", position: "TE", opponent: "vs DAL", projection: 9.43, score: 49.2, confidence: 51, usage: "4 targets projected", weather: "Clear", matchup: "Target competition limits ceiling", selected: false },
  { id: "marks", name: "Woody Marks", team: "HOU", position: "RB", opponent: "vs BUF", projection: 8, score: 45.8, confidence: 48, usage: "Change-of-pace role", weather: "Clear", matchup: "BUF front is a difficult draw", selected: false },
  { id: "meyers", name: "Jakobi Meyers", team: "JAX", position: "WR", opponent: "vs CLE", projection: 10.41, score: 56.1, confidence: 58, usage: "6 targets projected", weather: "Clear", matchup: "Reliable short-area role", selected: false },
  { id: "worthy", name: "Xavier Worthy", team: "KC", position: "WR", opponent: "vs DEN", projection: 9.56, score: 53.6, confidence: 56, usage: "Deep-threat usage", weather: "Clear", matchup: "Boom-or-bust matchup", selected: false },
];

export const playerSearchResults = [
  { id: "metcalf", name: "DK Metcalf", team: "SEA", position: "WR", projection: 14.6 },
  { id: "goedert", name: "Dallas Goedert", team: "PHI", position: "TE", projection: 10.8 },
  { id: "goff", name: "Jared Goff", team: "DET", position: "QB", projection: 18.9 },
];
