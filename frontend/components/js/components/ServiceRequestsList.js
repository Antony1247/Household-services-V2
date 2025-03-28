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
            <h1 class="text-center">Service Requests</h1>
            <table class="table table-bordered mt-3">
                <thead class="table-dark">
                    <tr>
                        <th>ID</th>
                        <th>Customer</th>
                        <th>Service</th>
                        <th>Professional</th>
                        <th>Status</th>
                        <th>Booking Date</th>
                        <th>Booking Time</th>
                        <th>Rating</th>
                        <th>Review</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="request in serviceRequests" :key="request.id">
                        <td>{{ request.id }}</td>
                        <td>{{ request.customer_name }}</td>
                        <td>{{ request.service_name }}</td>
                        <td>{{ request.professional_name }}</td>
                        <td :class="getStatusClass(request.status)">{{ request.status }}</td>
                        <td>{{ request.booking_date }}</td>
                        <td>{{ request.booking_time }}</td>
                        <td>{{ request.rating ?? 'N/A' }}</td>
                        <td>{{ request.review ?? 'No Review' }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    `,
    data() {
        return {
            serviceRequests: []
        };
    },
    methods: {
        async fetchServiceRequests() {
            try {
                const response = await axios.get('/api/service_requests', {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.serviceRequests = response.data.service_requests;
            } catch (error) {
                console.error("Error fetching service requests:", error);
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
    },
    mounted() {
        this.fetchServiceRequests();
    }
};
