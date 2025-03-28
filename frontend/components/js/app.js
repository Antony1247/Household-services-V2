import router from "./router.js";

const App = {
    template: `
        <div>
            <!-- Show Login Navbar Only on Login/Register Pages -->
            <nav v-if="isLoginPage" class="navbar navbar-expand-lg navbar-light bg-light">
                <a class="navbar-brand" href="#">Household Services</a>
                <ul class="navbar-nav ml-auto">
                    <li class="nav-item">
                        <router-link to="/login" class="nav-link">Login</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link to="/register-customer" class="nav-link">Register as Customer</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link to="/register-professional" class="nav-link">Register as Professional</router-link>
                    </li>
                </ul>
            </nav>

            <!-- Render Dashboard Components Based on Routes -->
            <router-view></router-view>
        </div>
    `,
    computed: {
        isAuthenticated() {
            return !!localStorage.getItem("token");
        },
        isAdmin() {
            return localStorage.getItem("role") === "Admin";
        },
        isCustomer() {
            return localStorage.getItem("role") === "Customer";
        },
        isProfessional() {
            return localStorage.getItem("role") === "Professional";
        },
        isLoginPage() {
            return ["/login", "/register-customer", "/register-professional"].includes(this.$route.path);
        }
    },
    methods: {
        logout() {
            axios.post('/api/logout', {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                .then(() => {
                    localStorage.clear();
                    window.location.href = "/#/login";
                })
                .catch(error => console.error(error));
        }
    }
};

const app = Vue.createApp(App);
app.use(router);
app.mount("#app");
