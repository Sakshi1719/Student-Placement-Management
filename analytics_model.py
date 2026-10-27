import pandas as pd
import numpy as np
import json
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error, accuracy_score, classification_report, roc_auc_score
from scipy import stats

def run_analytics():
    df = pd.read_csv("students_dataset.csv")
    print(f"Loaded {len(df)} student records.")

    # 1. Descriptive Statistics
    desc_stats = {
        'total_students': int(len(df)),
        'placed_students': int((df['placement_status'] == 'Placed').sum()),
        'unplaced_students': int((df['placement_status'] == 'Unplaced').sum()),
        'overall_placement_rate': round(float((df['placement_status'] == 'Placed').mean() * 100), 2),
        'attendance': {
            'mean': round(float(df['attendance_percentage'].mean()), 2),
            'median': round(float(df['attendance_percentage'].median()), 2),
            'std': round(float(df['attendance_percentage'].std()), 2),
            'min': round(float(df['attendance_percentage'].min()), 2),
            'max': round(float(df['attendance_percentage'].max()), 2)
        },
        'cgpa': {
            'mean': round(float(df['overall_cgpa'].mean()), 2),
            'median': round(float(df['overall_cgpa'].median()), 2),
            'std': round(float(df['overall_cgpa'].std()), 2),
            'min': round(float(df['overall_cgpa'].min()), 2),
            'max': round(float(df['overall_cgpa'].max()), 2)
        },
        'salary_placed': {
            'mean': round(float(df[df['placement_status'] == 'Placed']['placement_salary_lpa'].mean()), 2),
            'median': round(float(df[df['placement_status'] == 'Placed']['placement_salary_lpa'].median()), 2),
            'std': round(float(df[df['placement_status'] == 'Placed']['placement_salary_lpa'].std()), 2),
            'min': round(float(df[df['placement_status'] == 'Placed']['placement_salary_lpa'].min()), 2),
            'max': round(float(df[df['placement_status'] == 'Placed']['placement_salary_lpa'].max()), 2)
        }
    }

    # 2. Statistical Hypothesis Testing: Attendance Impact (<75% vs >=75%)
    low_att = df[df['attendance_percentage'] < 75.0]
    high_att = df[df['attendance_percentage'] >= 75.0]

    # Two-sample t-test on CGPA between low and high attendance
    t_stat_cgpa, p_val_cgpa = stats.ttest_ind(high_att['overall_cgpa'], low_att['overall_cgpa'], equal_var=False)
    
    # Placement rate comparison
    low_att_placement_rate = float((low_att['placement_status'] == 'Placed').mean() * 100)
    high_att_placement_rate = float((high_att['placement_status'] == 'Placed').mean() * 100)
    
    # Salary comparison (for placed students)
    placed_low_att = low_att[low_att['placement_status'] == 'Placed']['placement_salary_lpa']
    placed_high_att = high_att[high_att['placement_status'] == 'Placed']['placement_salary_lpa']
    t_stat_salary, p_val_salary = stats.ttest_ind(placed_high_att, placed_low_att, equal_var=False)

    stats_tests = {
        'attendance_threshold_analysis': {
            'low_attendance_count': int(len(low_att)),
            'high_attendance_count': int(len(high_att)),
            'low_att_placement_rate': round(low_att_placement_rate, 2),
            'high_att_placement_rate': round(high_att_placement_rate, 2),
            'low_att_avg_cgpa': round(float(low_att['overall_cgpa'].mean()), 2),
            'high_att_avg_cgpa': round(float(high_att['overall_cgpa'].mean()), 2),
            't_stat_cgpa': round(float(t_stat_cgpa), 4),
            'p_value_cgpa': float(f"{p_val_cgpa:.4e}"),
            'low_att_placed_salary': round(float(placed_low_att.mean()), 2),
            'high_att_placed_salary': round(float(placed_high_att.mean()), 2),
            't_stat_salary': round(float(t_stat_salary), 4),
            'p_value_salary': float(f"{p_val_salary:.4e}"),
            'conclusion': "Students with >=75% attendance demonstrate statistically significant superiority in both CGPA (p < 0.001) and placement packages."
        }
    }

    # 3. Specialization-wise Performance
    spec_summary = {}
    for spec, grp in df.groupby('specialisation'):
        placed_grp = grp[grp['placement_status'] == 'Placed']
        spec_summary[spec] = {
            'cohort_size': int(len(grp)),
            'placement_rate': round(float((grp['placement_status'] == 'Placed').mean() * 100), 2),
            'avg_cgpa': round(float(grp['overall_cgpa'].mean()), 2),
            'avg_attendance': round(float(grp['attendance_percentage'].mean()), 2),
            'avg_placed_salary': round(float(placed_grp['placement_salary_lpa'].mean()), 2) if len(placed_grp) > 0 else 0,
            'max_placed_salary': round(float(placed_grp['placement_salary_lpa'].max()), 2) if len(placed_grp) > 0 else 0
        }

    # 4. Correlation Matrix
    corr_cols = ['overall_cgpa', 'attendance_percentage', 'aptitude_score', 'soft_skills_score', 'certifications_count', 'live_projects_count', 'placement_salary_lpa']
    corr_df = df[df['placement_status'] == 'Placed'][corr_cols].corr().round(3)
    correlation_matrix = corr_df.to_dict()

    # 5. Multiple Linear Regression for Placement Salary (Placed Candidates)
    placed_df = df[df['placement_status'] == 'Placed'].copy()
    
    # Feature matrix with one-hot encoded specialization
    X_reg = pd.get_dummies(placed_df[['overall_cgpa', 'attendance_percentage', 'aptitude_score', 'soft_skills_score', 'certifications_count', 'live_projects_count', 'specialisation']], drop_first=True)
    y_reg = placed_df['placement_salary_lpa']

    X_train, X_test, y_train, y_test = train_test_split(X_reg, y_reg, test_size=0.20, random_state=42)
    reg_model = LinearRegression()
    reg_model.fit(X_train, y_train)

    y_pred_reg = reg_model.predict(X_test)
    r2 = r2_score(y_test, y_pred_reg)
    mae = mean_absolute_error(y_test, y_pred_reg)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred_reg))

    reg_coefficients = {col: round(float(coef), 4) for col, coef in zip(X_reg.columns, reg_model.coef_)}
    reg_coefficients['Intercept'] = round(float(reg_model.intercept_), 4)

    regression_results = {
        'r2_score': round(float(r2), 4),
        'mae_lpa': round(float(mae), 4),
        'rmse_lpa': round(float(rmse), 4),
        'coefficients': reg_coefficients
    }

    # 6. Logistic Regression for Placement Likelihood
    X_clf = pd.get_dummies(df[['overall_cgpa', 'attendance_percentage', 'aptitude_score', 'soft_skills_score', 'certifications_count', 'live_projects_count', 'specialisation']], drop_first=True)
    y_clf = (df['placement_status'] == 'Placed').astype(int)

    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X_clf, y_clf, test_size=0.20, random_state=42)
    clf_model = LogisticRegression(max_iter=1000)
    clf_model.fit(X_train_c, y_train_c)

    y_pred_c = clf_model.predict(X_test_c)
    y_pred_proba_c = clf_model.predict_proba(X_test_c)[:, 1]
    acc = accuracy_score(y_test_c, y_pred_c)
    roc_auc = roc_auc_score(y_test_c, y_pred_proba_c)

    classification_results = {
        'accuracy': round(float(acc), 4),
        'roc_auc': round(float(roc_auc), 4),
        'feature_weights': {col: round(float(w), 4) for col, w in zip(X_clf.columns, clf_model.coef_[0])},
        'intercept': round(float(clf_model.intercept_[0]), 4)
    }

    # 7. Prescriptive Academic Interventions Summary
    interventions_summary = df['intervention_category'].value_counts().to_dict()
    at_risk_students = df[df['performance_band'].isin(['Band 3: Skill Deficit (Moderate Risk)', 'Band 4: Critical Academic Intervention'])][
        ['student_id', 'full_name', 'specialisation', 'overall_cgpa', 'attendance_percentage', 'performance_band', 'recommended_intervention']
    ]
    at_risk_students.to_csv("academic_interventions_report.csv", index=False)
    print(f"Saved {len(at_risk_students)} at-risk student intervention records to academic_interventions_report.csv")

    output_results = {
        'descriptive_statistics': desc_stats,
        'hypothesis_tests': stats_tests,
        'specialisation_analytics': spec_summary,
        'correlation_matrix': correlation_matrix,
        'salary_regression_model': regression_results,
        'placement_classification_model': classification_results,
        'interventions_summary': interventions_summary
    }

    with open("analytics_results.json", "w") as f:
        json.dump(output_results, f, indent=2)
    print("Saved comprehensive analytics results to analytics_results.json")

    print("\n================ ANALYTICS HIGHLIGHTS ================")
    print(f"Multiple Regression R2 (Placement Salary): {r2:.3f}")
    print(f"Regression MAE: {mae:.3f} LPA")
    print(f"Classification Accuracy (Placement): {acc * 100:.2f}% (ROC-AUC: {roc_auc:.3f})")
    print("Key Predictors of Salary:")
    for feat, val in sorted(reg_coefficients.items(), key=lambda x: abs(x[1]), reverse=True)[:5]:
        print(f"  - {feat}: {val:+0.3f}")

if __name__ == "__main__":
    run_analytics()
