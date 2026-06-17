// Placeholder for the monthly dashboard (net / income / spent / category
// breakdown / budget progress). The real dashboard is built in a later step.
export default function Dashboard() {
  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      <div className="placeholder-card">
        <p>Your monthly overview will live here:</p>
        <ul>
          <li>Net, total income, and total spent for the month</li>
          <li>Spending broken down by category</li>
          <li>Budget progress bars, with over-budget categories highlighted</li>
        </ul>
        <p className="placeholder-note">Coming up as we build out the dashboard.</p>
      </div>
    </div>
  );
}
