export default {
    template: `
    <div>
            <nav class="navbar navbar-dark bg-dark">
                <div class="container-fluid">
                    <a class="navbar-brand" href="/#/admin-dashboard">Admin Dashboard</a>
                    <div>
                        <router-link to="/servicesList" class="nav-link d-inline text-white">Manage Services</router-link>
                        <router-link to="/professionalsList" class="nav-link d-inline text-white">Manage Professionals</router-link>
                        <router-link to="/customers" class="nav-link d-inline text-white">Manage Customers</router-link>
                        <router-link to="/service-requests" class="nav-link d-inline text-white">service requests</router-link>
                        <router-link to="/export-service-requests" class="nav-link d-inline text-white">Export CSV</router-link>
                        <router-link to="/admin-search" class="nav-link d-inline text-white">Search</router-link>
                        <button @click="logout" class="btn btn-danger ms-3">Logout</button>
                    </div>
                </div>
            </nav>
        <div class="container mt-5">
            <h1 class="text-center">Admin Search</h1>
            
            <input type="text" class="form-control mb-3" v-model="searchQuery" placeholder="Search by name, email, or service" @input="performSearch">
            
            <div v-if="professionals.length || customers.length || serviceRequests.length">
                <h3>Professionals</h3>
                <table class="table table-bordered">
                    <thead class="table-dark">
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Specialization</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="professional in professionals" :key="professional.id">
                            <td>{{ professional.id }}</td>
                            <td>{{ professional.full_name }}</td>
                            <td>{{ professional.email }}</td>
                            <td>{{ professional.specialization }}</td>
                            <td>{{ professional.status }}</td>
                        </tr>
                    </tbody>
                </table>

                <h3>Customers</h3>
                <table class="table table-bordered">
                    <thead class="table-dark">
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="customer in customers" :key="customer.id">
                            <td>{{ customer.id }}</td>
                            <td>{{ customer.full_name }}</td>
                            <td>{{ customer.email }}</td>
                            <td>{{ customer.phone }}</td>
                            <td :class="{'text-danger': customer.status === 'Blocked', 'text-success': customer.status === 'Active'}">
                                {{ customer.status }}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <h3>Service Requests</h3>
                <table class="table table-bordered">
                    <thead class="table-dark">
                        <tr>
                            <th>ID</th>
                            <th>Customer</th>
                            <th>Service</th>
                            <th>Status</th>
                            <th>Booking Date</th>
                            <th>Booking Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="request in serviceRequests" :key="request.id">
                            <td>{{ request.id }}</td>
                            <td>{{ request.customer_name }}</td>
                            <td>{{ request.service_name }}</td>
                            <td :class="getStatusClass(request.status)">{{ request.status }}</td>
                            <td>{{ request.booking_date }}</td>
                            <td>{{ request.booking_time }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            searchQuery: "",
            professionals: [],
            customers: [],
            serviceRequests: []
        };
    },
    methods: {
        async performSearch() {
            if (this.searchQuery.length < 2) {
                this.professionals = [];
                this.customers = [];
                this.serviceRequests = [];
                return;
            }

            try {
                const response = await axios.get(`/api/admin/search?query=${this.searchQuery}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });

                this.professionals = response.data.professionals;
                this.customers = response.data.customers;
                this.serviceRequests = response.data.service_requests;
            } catch (error) {
                console.error("Error performing search:", error);
            }
        },
        getStatusClass(status) {
            if (status === "Completed") return "text-success";
            if (status === "Rejected") return "text-danger";
            return "text-warning";
        },
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
