import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards/auth.guard';
import { LoginPage } from './features/auth/pages/login.page';
import { RegisterPage } from './features/auth/pages/register.page';
import { ProfilePage } from './features/auth/pages/profile.page';
import { AdminDashboardPage } from './features/auth/pages/admin-dashboard.page';
import { ForgotPasswordPage } from './features/auth/pages/forgot-password.page';
import { ResetPasswordPage } from './features/auth/pages/reset-password.page';
import { VerifyEmailPage } from './features/auth/pages/verify-email.page';
import { MfaVerifyPage } from './features/auth/pages/mfa-verify.page';
import { DynamicSurveyPage } from './features/survey/pages/dynamic-survey.page';
import { ScoringDashboardPage } from './features/scoring/pages/scoring-dashboard.page';
import { FamilyDashboardPage } from './features/family/pages/family-dashboard.page';
import { AddAdolescentPage } from './features/family/pages/add-adolescent.page';
import { AdolescentDashboardPage } from './features/dashboard/pages/adolescent-dashboard.page';
import { EducationSpacePage } from './features/education/pages/education-space.page';
import { TeleconsultationPage } from './features/teleconsultation/pages/teleconsultation.page';
import ShellLayoutComponent from './core/layout/shell-layout.component';
import { SpecialistsAdminPage } from './features/admin/pages/specialists-admin.page';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'auth/login' },
	{ path: 'auth/login', component: LoginPage, canActivate: [guestGuard] },
	{ path: 'auth/register', component: RegisterPage, canActivate: [guestGuard] },
	{ path: 'auth/forgot-password', component: ForgotPasswordPage, canActivate: [guestGuard] },
	{ path: 'auth/verify-email', component: VerifyEmailPage },
	{ path: 'auth/mfa', component: MfaVerifyPage, canActivate: [guestGuard] },
	{ path: 'auth/reset-password', component: ResetPasswordPage, canActivate: [guestGuard] },
	{ path: 'reset-password', component: ResetPasswordPage, canActivate: [guestGuard] },
	{
		path: '',
		component: ShellLayoutComponent,
		canActivate: [authGuard],
		children: [
			{ path: 'auth/profile', component: ProfilePage },
			{ path: 'survey/dynamic', component: DynamicSurveyPage },
			{ path: 'family/dashboard', component: FamilyDashboardPage },
			{ path: 'family/add-adolescent', component: AddAdolescentPage },
			{ path: 'dashboard/adolescent', component: AdolescentDashboardPage },
			{ path: 'education/resources', component: EducationSpacePage },
			{ path: 'teleconsultation', component: TeleconsultationPage },
			{ path: 'scoring/results', component: ScoringDashboardPage },
			{ path: 'admin/dashboard', component: AdminDashboardPage, canActivate: [adminGuard] },
			{ path: 'admin/specialists', component: SpecialistsAdminPage, canActivate: [adminGuard] },
		],
	},
	{ path: '**', redirectTo: 'auth/login' },
];
