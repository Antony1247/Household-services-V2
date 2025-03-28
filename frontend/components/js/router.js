import Home from './components/Home.js';
import Login from './components/Login.js';
import RegisterCustomer from './components/RegisterCustomer.js';
import RegisterProfessional from './components/RegisterProfessional.js';
import AdminDashboard from './components/AdminDashboard.js';
import ProfessionalDashboard from './components/ProfessionalDashboard.js';
import ServicesList from './components/ServicesList.js';
import ProfessionalsList from './components/ProfessionalsList.js';
import ProfessionalDetails from './components/ProfessionalDetails.js';
import CustomersList from './components/CustomersList.js';
import CustomerDetails from './components/CustomerDetails.js';
import ServiceRequestsList from './components/ServiceRequestsList.js';
import AdminSearch from './components/AdminSearch.js';
import CustomerDashboard from './components/CustomerDashboard.js';
import CurrentBookings from './components/CurrentBookings.js';
import BookingHistory from './components/BookingHistory.js';
import CustomerProfile from './components/CustomerProfile.js';
import SearchServices from './components/CustomerSearch.js';
import AssignedRequests from './components/AssignedRequests.js';
import CompletedRequests from './components/CompletedRequests.js';
import ProfessionalProfile from './components/ProfessionalProfile.js';
import ExportServiceRequests from './components/ExportServiceRequests.js';

const routes = [
    { path: "/", component: Home },
    { path: "/login", component: Login },
    { path: "/register-customer", component: RegisterCustomer },
    { path: "/register-professional", component: RegisterProfessional },
    { path: "/admin-dashboard", component: AdminDashboard, meta: { requiresAuth: true, role: "Admin" } },
    { path: "/servicesList", component: ServicesList, meta: { requiresAuth: true } },
    { path: "/professionalsList", component: ProfessionalsList, meta: { requiresAuth: true } },
    { path: "/professionals/:professional_id", component: ProfessionalDetails, meta: { requiresAuth: true } },
    { path: "/customers", component: CustomersList, meta: { requiresAuth: true, role: "Admin" } },
    { path: "/customer/:id", component: CustomerDetails, meta: { requiresAuth: true} },
    { path: "/service-requests", component: ServiceRequestsList, meta: { requiresAuth: true, role: "Admin" } },
    { path: "/admin-search", component: AdminSearch, meta: { requiresAuth: true, role: "Admin" } },
    { path: "/customer-dashboard", component: CustomerDashboard, meta: { requiresAuth: true, role: "Customer" } },
    { path: "/current-bookings", component: CurrentBookings, meta: { requiresAuth: true, role: "Customer" } },
    { path: "/booking-history", component: BookingHistory, meta: { requiresAuth: true, role: "Customer" } },
    { path: "/profile", component: CustomerProfile, meta: { requiresAuth: true, role: "Customer" } },
    { path: "/customer-search", component: SearchServices, meta: { requiresAuth: true, role: "Customer" } },
    { path: "/professional-dashboard", component: ProfessionalDashboard, meta: { requiresAuth: true, role: "Professional" } },
    { path: "/assigned-requests", component: AssignedRequests, meta: { requiresAuth: true, role: "Professional" } },
    { path: "/completed-requests", component: CompletedRequests, meta: { requiresAuth: true, role: "Professional" } },
    { path: "/professional-profile", component: ProfessionalProfile, meta: { requiresAuth: true, role: "Professional" } },
    { path: '/export-service-requests', component: ExportServiceRequests }

];

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes
});

// Route Guard for Role-Based Access
router.beforeEach((to, from, next) => {
    const isAuthenticated = !!localStorage.getItem("token");
    const userRole = localStorage.getItem("role");

    if (to.meta.requiresAuth) {
        if (!isAuthenticated) {
            next("/login");
        } else if (to.meta.role && to.meta.role !== userRole) {
            next("/"); // Redirect unauthorized users to home
        } else {
            next();
        }
    } else {
        next();
    }
});

export default router;
