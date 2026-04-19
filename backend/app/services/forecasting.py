"""
6-month temporal forecast using simple linear regression with 95% confidence intervals.
(Prophet/mlflow replaced with lightweight numpy-based linear extrapolation for portability.)
"""
from dataclasses import dataclass
import numpy as np


@dataclass
class ForecastPoint:
    month_offset: int
    predicted: float
    lower: float
    upper: float


def linear_forecast(values: list[float], steps: int = 6) -> list[ForecastPoint]:
    """Linear regression extrapolation for `steps` months ahead with ±10% confidence band."""
    n = len(values)
    if n < 2:
        last = values[-1] if values else 0.0
        return [ForecastPoint(i + 1, last, last * 0.9, last * 1.1) for i in range(steps)]

    x = np.arange(n, dtype=float)
    y = np.array(values, dtype=float)

    # Ordinary least-squares fit
    coeffs = np.polyfit(x, y, 1)
    slope, intercept = coeffs[0], coeffs[1]

    # Residual std-dev for confidence interval
    y_hat = np.polyval(coeffs, x)
    residuals = y - y_hat
    std_err = float(np.std(residuals)) if n > 2 else abs(float(slope))

    result: list[ForecastPoint] = []
    for i in range(1, steps + 1):
        pred = float(np.polyval(coeffs, n - 1 + i))
        margin = 1.96 * std_err  # ~95% CI
        result.append(ForecastPoint(
            month_offset=i,
            predicted=round(pred, 2),
            lower=round(pred - margin, 2),
            upper=round(pred + margin, 2),
        ))
    return result
